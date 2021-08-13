import traceback
from celery.result import AsyncResult
from cms.tasks import async_zendesk_sync
from cms.controllers.documentation import generate_doc_json
from cms.controllers.modify_db import save_unrevisioned_records
from cms.controllers.structure import external_file_to_content_file
from cms.forms import get_branding_shortcuts
from cms.models import *

from django.conf import settings
from django.utils.http import urlencode

import re
import uuid
import time
import threading
from functools import wraps
from typing import List
from zenpy import Zenpy
from zenpy.lib.api_objects.help_centre_objects import Category, Section, Article, Translation
from zenpy.lib.exception import APIException, RecordNotFoundException, ZenpyException


def clean_nodes(nodes):
    for node in nodes:
        clean_nodes(list(node.nodes.all()))
        if node.asset:
            node.asset.delete()
        node.delete()


def clean_menu(menu: Menu):
    for zd_category in menu.zendeskcategory_set.all():
        zd_category.delete()
    clean_nodes(list(menu.nodes.all()))


def item_position(item):
    return item.position


def generate_branding_dict():
    branding, hidden_branding = get_branding_shortcuts()
    branding.extend(hidden_branding)
    rep = {re.escape(value): ds['name'] for ds, value in branding}
    rep[re.escape('Nx Cloud')] = '%CLOUD_NAME%'
    rep[re.escape('Nx Meta')] = '%VMS_NAME%'
    return rep


def substitute_branding(repl_dict, text):
    if not text:
        return ''
    # Searches for any the keys from replacement dict
    # When one is found, the lambda function returns the value for that key and it is used as the replacement
    return re.sub("|".join(repl_dict.keys()), lambda match: repl_dict[re.escape(match.group(0))], text)


class CategoryNotFoundException(Exception):
    pass


class ZendeskNotConfigured(Exception):
    pass


def background(f):
    '''
    a threading decorator
    use @background above the function you want to run in the background
    '''
    def background_func(*args, **kwargs):
        threading.Thread(target=f, args=args, kwargs=kwargs).start()
    return background_func


def retry(exception_to_retry=Exception, retries=3, delay=3, backoff=2, logger=None, block_final_exception=False):
    """Retries function after certain exceptions, also optionally catches final exception.
    """
    def deco_retry(func_to_retry):

        @wraps(func_to_retry)
        def decorated_func(*args, **kwargs):
            next_delay = delay

            for _ in range(retries):
                try:
                    return func_to_retry(*args, **kwargs)
                except exception_to_retry as err:
                    message = f"{str(err)}, Retrying in {next_delay} seconds..."

                    if logger:
                        logger.warning(message)
                    else:
                        # For local debugging
                        print(message)

                    time.sleep(next_delay)
                    next_delay *= backoff
            else:
                if block_final_exception:
                    try:
                        return func_to_retry(*args, **kwargs)
                    except exception_to_retry as err:
                        message = f"Failed after {retries} retries. {args}"
                        if logger:
                            logger.warning(message)
                else:
                    return func_to_retry(*args, **kwargs)

        return decorated_func  # true decorator

    return deco_retry


class Importer:
    def __init__(self, domain, subdomain, creds, user):
        self.zen_client = Zenpy(domain=domain, subdomain=subdomain, **creds)
        self.menu = None
        self.customization = None
        self.all_customizations = Customization.objects.all()
        self.category_name = None
        self.category = None
        self.all_sections = None
        self.site = None
        self.branding = None
        self.asset_type = AssetType.objects.get(name='', type=AssetType.ASSET_TYPES.documentation)
        self.user = user

    def _export_sections(self, sections):
        section_list = []
        for section in sorted(sections, key=item_position):
            outer = {'object': section, 'articles': [], 'sections': []}
            for article in sorted(self.zen_client.help_center.articles.search(section=section.id), key=item_position):
                outer['articles'].append(article)
            outer['sections'] = self._export_sections(list(filter(
                lambda x: x.parent_section_id == section.id, self.all_sections
            )))
            section_list.append(outer)
        return section_list

    def _pull_category_from_zendesk(self):
        categories = self.zen_client.help_center.categories()
        target_category = next((category for category in categories if category.name == self.category_name), None)
        if not target_category:
            raise CategoryNotFoundException
        self.all_sections = list(self.zen_client.help_center.categories.sections(category_id=target_category.id))
        first_level_sections = list(filter(lambda section: section.parent_section_id is None, self.all_sections))
        section_list = self._export_sections(first_level_sections)

        return {'category': target_category, 'sections': section_list}

    def _article_save_records(self, article, asset):
        def sub_image_sources(match_obj):
            file_id = str(uuid.uuid4())
            files[file_id] = external_file_to_content_file(match_obj[2])
            return f'{match_obj[1]}src="{{image_import:{file_id}}}"'

        context_model = Context.objects.get(asset_type=self.asset_type, name='content')
        data_records = {
            'title': substitute_branding(self.branding, article.title),
            'body': substitute_branding(self.branding, article.body),
            'labels': ', '.join(set(article.label_names))
        }
        files = {}
        data_records['body'] = re.sub(r'(<img[^>]*?)src="(.*?)"', sub_image_sources, data_records['body'])
        save_unrevisioned_records(asset, context_model, None, context_model.datastructure_set.all(), data_records,
                                  files, self.user)

    def _update_zendesk_article(self, article, zd_article):
        zd_article.author_id = article.author_id
        zd_article.comments_disabled = article.comments_disabled
        zd_article.draft = article.draft
        zd_article.edited_at = article.edited_at
        zd_article.html_url = article.html_url,
        zd_article.permission_group_id = article.permission_group_id
        zd_article.position = article.position
        zd_article.promoted = article.promoted
        zd_article.title = article.title
        zd_article.updated_at = article.updated_at
        zd_article.user_segment_id = article.user_segment_id
        zd_article.save()
        labels = [
            ZendeskArticleLabel.objects.get_or_create(
                name=label_name, site=self.site
            )[0]
            for label_name in article.label_names
        ]

        zd_article.labels.set(labels)

    def _create_zendesk_article(self, article, asset, section, menu_node):
        zd_article = ZendeskArticle.objects.create(
            site=self.site, section=section, menu_node=menu_node,
            article_id=article.id, author_id=article.author_id, comments_disabled=article.comments_disabled,
            created_at=article.created_at, draft=article.draft, edited_at=article.edited_at, html_url=article.html_url,
            permission_group_id=article.permission_group_id, position=article.position, promoted=article.promoted,
            title=article.title, updated_at=article.updated_at, user_segment_id=article.user_segment_id, asset=asset,
        )
        labels = [
            ZendeskArticleLabel.objects.get_or_create(
                name=label_name, site=self.site
            )[0]
            for label_name in article.label_names
        ]

        zd_article.labels.set(labels)

    def _create_zendesk_sections(self, sections, parent_section=None, parent_menu_node=None):
        for section in sections:
            section_object = section['object']
            name = substitute_branding(self.branding, section_object.name)

            if parent_menu_node:
                menu_node, created = MenuNode.objects.get_or_create(name=name, parent_node=parent_menu_node)
            else:
                menu_node, created = MenuNode.objects.get_or_create(name=name, parent_menu=self.menu)
            menu_node.order = section['object'].position
            menu_node.save()
            if created:
                menu_node.enabled.set(self.all_customizations)
            zd_section = ZendeskSection.objects.get_or_create(
                section_id=section_object.id, parent_category=self.category, site=self.site, menu_node=menu_node,
                parent_section=parent_section
            )[0]
            zd_section.name = section_object.name
            zd_section.position = section_object.position
            zd_section.save()

            for article in section['articles']:
                article_menu_node, article_node_created = MenuNode.objects.get_or_create(
                    name=substitute_branding(self.branding, article.title), parent_node=menu_node,
                )
                article_menu_node.order = article.position
                article_menu_node.save()
                if article_node_created or not article_menu_node.asset:
                    article_menu_node.enabled.set(self.all_customizations)
                    article_asset = Asset.objects.create(
                        asset_type=self.asset_type, name=substitute_branding(self.branding, article.title)
                    )
                    article_asset.customizations.set(self.all_customizations)
                    article_menu_node.asset = article_asset
                    article_menu_node.save()
                zd_article = ZendeskArticle.objects.filter(
                    section=zd_section, article_id=article.id, asset=article_menu_node.asset
                ).first()
                if not zd_article:
                    self._create_zendesk_article(article, article_menu_node.asset, zd_section, article_menu_node)
                else:
                    self._update_zendesk_article(article, zd_article)

                self._article_save_records(article, article_menu_node.asset)

            self._create_zendesk_sections(
                section['sections'], parent_section=zd_section, parent_menu_node=menu_node
            )

    def import_knowledgebase(self, menu, category_name):
        self.menu = menu
        self.category_name = category_name
        self.customization = Customization.objects.get(name=settings.CUSTOMIZATION)
        self.site = ZendeskSite.objects.get_or_create(customization=self.customization)[0]
        self.branding = generate_branding_dict()
        struct = self._pull_category_from_zendesk()
        self.category = ZendeskCategory.objects.get_or_create(
            site=self.site, menu=menu, name=struct['category'].name, category_id=struct['category'].id
        )[0]
        self._create_zendesk_sections(struct['sections'])


class ZendeskBase:
    def __init__(self, customization_name=settings.CUSTOMIZATION, cloud_portal=None):
        self.customization_name = customization_name
        self.cloud_portal = cloud_portal or get_cloud_portal_asset(self.customization_name)
        domain = self.cloud_portal.read_global_value('%ZENDESK_DOMAIN%')
        api_key = self.cloud_portal.read_global_value('%ZENDESK_API_KEY%')
        email = self.cloud_portal.read_global_value('%ZENDESK_API_EMAIL%')
        self.default_permission_group_id = self.cloud_portal.read_global_value('%ZENDESK_PERM_GROUP_ID%')
        if not domain or not api_key:
            raise ZendeskNotConfigured
        domain_parts = domain.split('.')
        if len(domain_parts) < 3:
            subdomain = ''
        else:
            domain = f'{domain_parts[-2]}.{domain_parts[-1]}'
            subdomain = '.'.join(domain_parts[:-2])
        self.zen_client = Zenpy(domain=domain, subdomain=subdomain, token=api_key, email=email)


class ZendeskMapper(ZendeskBase):
    struct = []


    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site = ZendeskSite.objects.filter(customization__name=self.customization_name).first()
        self.zd_categories = ZendeskCategory.objects.filter(site=self.site)
        self.zd_sections = ZendeskSection.objects.filter(site=self.site)
        self.zd_articles = ZendeskArticle.objects.filter(site=self.site)


    def _map_item(self, item, label):
        section_id = getattr(item, 'parent_section_id', None) or getattr(item, 'section_id', None)
        category_id = getattr(item, 'category_id', None)
        parent_category_pk = getattr(self.zd_categories.filter(category_id=category_id).first(), 'pk', None)
        parent_section_pk = getattr(self.zd_sections.filter(section_id=section_id).first(), 'pk', None)
        admin_url, zd_admin_url, asset_url = self._get_admin_urls(item.id, label)
        query_params = {
            k: v for k, v in
            {
                f'{label}_id': item.id,
                'name': item.name,
                'site': self.site.id,
                'parent_category': parent_category_pk,
                'parent_section': parent_section_pk
            }.items()
            if v is not None
        }

        return {
            'type': label,
            f'zendesk_{label}_id': item.id,
            'name': item.name,
            'position': item.position,
            'category_id': category_id,
            'section_id': section_id,
            'url': item.html_url,
            'json': item.url,
            'admin_url': admin_url,
            'zd_admin_url': zd_admin_url,
            'links': [
                {'title': 'Admin Links', 'label': True},
                {
                    'title': f'Create Zendesk {label.title()}',
                    'url': '' if zd_admin_url else f"{reverse(f'admin:cms_zendesk{label}_add')}?{urlencode(query_params)}",
                    'class': 'success'
                },
                {'title': 'Menu' if label == 'category' else 'Menu Node', 'url': admin_url,  'class': 'primary'},
                {'title': f'Zendesk {label.title()}', 'url': zd_admin_url,  'class': 'primary'},
                {'title': f'Asset', 'url': asset_url,  'class': 'primary'},
                {'title': 'Zendesk Links', 'label': True, 'class': 'push-right'},
                {'title': f'{label.title()} HTML', 'url': item.html_url,  'class': 'info'},
                {'title': f'{label.title()} JSON', 'url': item.url,  'class': 'info'}
            ],
            'children': []
        }


    def _get_admin_urls(self, item_id, label):
        if label == 'article':
            existing = self.zd_articles.filter(article_id=item_id).first()
            if existing:
                return existing.menu_node.admin_link, existing.admin_link, existing.asset.admin_link
        elif label == 'section':
            existing = self.zd_sections.filter(section_id=item_id).first()
            if existing:
                return getattr(existing.menu_node, 'admin_link', None), existing.admin_link, None
        elif label == 'category':
            existing = self.zd_categories.filter(category_id=item_id).first()
            if existing:
                return getattr(existing.menu, 'admin_link', None), existing.admin_link, None
        return None, None, None
    

    def _map_and_sort(self, res, label):
        return sorted([self._map_item(item, label) for item in res], key=lambda item: item['position'])


    def _get_categories(self):
        return self._map_and_sort(self.zen_client.help_center.categories(), 'category')


    def _get_sections(self):
        return self._map_and_sort(self.zen_client.help_center.sections(), 'section')


    def _get_articles(self):
        return self._map_and_sort(self.zen_client.help_center.articles(), 'article')
    

    def build_struct(self):
        categories = {category['zendesk_category_id']: category for category in self._get_categories()}
        sections = {section['zendesk_section_id']: section for section in self._get_sections()}
        articles = self._get_articles()
    
        for article in articles:
            sections[article['section_id']]['children'].append(article)
            if not sections[article['section_id']]['admin_url']:
                sections[article['section_id']]['admin_url'] = sections[article['section_id']]['links'][2]['url'] = article['admin_url']

        for section in sections.values():
            categories[section['category_id']]['children'].append(section)
        self.struct = sorted(categories.values(), key=lambda category: category['position'])
        return self.struct


    def get_unmapped_and_empty(self, json_values=False):
        nodes = self.struct or self.build_struct()
        unmapped_nodes = {
            'customization': self.site.customization.name,
            'category': [],
            'section': [],
            'article': []
        }

        empty_nodes = {
            'customization': self.site.customization.name,
            'category': [],
            'section': []
        }


        def find_unmapped(node):
            children = node['children']
            type = node['type']

            if not node['zd_admin_url']:
                unmapped_nodes[type].append(node[f'zendesk_{type}_id'])

            if children:
                for child_node in children:
                    find_unmapped(child_node)
            elif type != 'article':
                empty_nodes[type].append(node[f'zendesk_{type}_id'])


        for node in nodes:
            find_unmapped(node)
        
        return {
            'unmapped': json.dumps(unmapped_nodes) if json_values else unmapped_nodes,
            'empty': json.dumps(empty_nodes) if json_values else empty_nodes
        }

    
    def clean_zd(self, items_to_remove):
        categories = items_to_remove.pop('category', [])
        sections = items_to_remove.pop('section', [])
        articles = items_to_remove.pop('article', [])

        @background
        @retry(block_final_exception=True)
        def clean_category(category_id):
            self.zen_client.help_center.categories.delete(Category(id=category_id))

        @background
        @retry(block_final_exception=True)
        def clean_section(section_id):
            self.zen_client.help_center.sections.delete(Section(id=section_id))
        
        @background
        @retry(block_final_exception=True)
        def clean_article(article_id):
            self.zen_client.help_center.articles.archive(Article(id=article_id))

        for category in categories:
            clean_category(category)
    
        for section in sections:
            clean_section(section)

        for article in articles:
            clean_article(article)



class Exporter(ZendeskBase):
    @retry()
    def sync_article(self, zd_article: ZendeskArticle, content=None, delete=False, sync_log=None):
        if not zd_article.latest_sync(sync_log):
            sync_item = ZendeskSyncItem.objects.filter(zendesk_article=zd_article, sync_log=sync_log).first()
            sync_item.mark_canceled()
            return None
        if not zd_article.sync:
            return None

        if delete and not zd_article.article_id:
            return None

        zenpy_article = None
        if zd_article.article_id:
            try:
                zenpy_article = self.zen_client.help_center.articles(id=zd_article.article_id)
            except RecordNotFoundException:
                zd_article.article_id = None
            if delete:
                if zenpy_article:
                    try:
                        self.zen_client.help_center.articles.archive(zenpy_article)
                    except RecordNotFoundException:
                        pass
                zd_article.needs_sync = False
                zd_article.save()
                return None
  
        if not zenpy_article:
            zenpy_article = Article()

        zenpy_article.position = zd_article.position
        zenpy_article.author_id = zd_article.author_id
        zenpy_article.section_id = zd_article.section.section_id
        zenpy_article.promoted = zd_article.promoted
        zenpy_article.comments_disabled = zd_article.comments_disabled
        zenpy_article.permission_group_id = zd_article.permission_group_id or self.default_permission_group_id
        zenpy_article.user_segment_id = zd_article.user_segment_id
        zenpy_article.draft = zd_article.draft
        zenpy_article.title = zd_article.title
        zenpy_article.label_names = list(zd_article.labels.values_list('name', flat=True))

        if not zenpy_article.id:
            zenpy_article = self.zen_client.help_center.articles.create(zd_article.section.section_id, zenpy_article)
        else:
            try:
                zenpy_article = self.zen_client.help_center.articles.update(zenpy_article)
            except RecordNotFoundException:
                zenpy_article = self.zen_client.help_center.articles.create(zd_article.section.section_id, zenpy_article)


        # Update cloud portal record with current zendesk data
        zd_article.author_id = zenpy_article.author_id
        zd_article.created_at = zenpy_article.created_at
        zd_article.edited_at = zenpy_article.edited_at
        zd_article.updated_at = zenpy_article.updated_at
        zd_article.html_url = zenpy_article.html_url
        zd_article.article_id = zenpy_article.id
        zd_article.user_segment_id = zenpy_article.user_segment_id
        zd_article.permission_group_id = zenpy_article.permission_group_id
        zd_article.save()

        # Update translation for actual content
        zenpy_translation: Translation = next(filter(
            lambda translation: translation.locale == 'en-us',
            self.zen_client.help_center.articles.translations(zenpy_article)
        ), None)
        if not zenpy_translation:
            zenpy_translation = Translation(source_id=zenpy_article.id, locale='en-us', source_type='Article')
        zenpy_translation.draft = zd_article.draft
        zenpy_translation.title = zd_article.title

        if content:
            from util.config import get_config
            conf = get_config(zd_article.site.customization.name)
            portal_url = conf["cloud_portal"]["url"]

            attachments_changed = False
            zenpy_translation.body = '<br>'.join(block['contentHTML'] for block in content['blocks'])
            existing_attachments = list(self.zen_client.help_center.attachments(zenpy_article.id))
            for file_info in content.get('external_files', []):
                attachment = next(filter(lambda attachment: attachment.file_name == file_info['external_file_name'], existing_attachments), None)
                external_file = ExternalFile.objects.get(id=file_info['id'])
                original = f'/{file_info["original_url"]}'

                if attachment:
                    existing_attachments.remove(attachment)
                else:
                    try:
                        attachment = self.zen_client.help_center.attachments.create(zenpy_article, external_file.file.file, inline=True, file_name=file_info['external_file_name'])
                        attachments_changed = True
                    except (ZenpyException, ValueError, OSError, APIException):
                        # ZenpyException: Most likely from a file being too large.
                        # ValueError or OSError: Most likely an ExternalFile is missing it's file.
                        pass

                # Use zendesk url if attachment was created else link to cloud portal
                replacement = attachment.relative_path if getattr(attachment, 'id', False) else f"{portal_url}{original}"

                if original not in zenpy_translation.body:
                    try:
                        self.zen_client.help_center.attachments.delete(attachment)
                        attachments_changed = True
                    except RecordNotFoundException:
                        # Handle deleting none existing attachment
                        pass

                zenpy_translation.body = zenpy_translation.body.replace(original, replacement)

            if existing_attachments:
                attachments_changed = True
                for attachment in existing_attachments:
                    self.zen_client.help_center.attachments.delete(attachment)
            zd_article.title = content['title']
            zenpy_translation.title = content['title']

            labels_changed = set(content['labels']) != set(zenpy_article.label_names)
            zenpy_article.label_names = content['labels']
            if labels_changed or attachments_changed:
                self.zen_client.help_center.articles.update(zenpy_article)

        if zenpy_translation.id:
            self.zen_client.help_center.articles.update_translation(zenpy_article, zenpy_translation)
        else:
            self.zen_client.help_center.articles.create_translation(zenpy_article, zenpy_translation)

        zd_article.needs_sync = False
        zd_article.save()
        customization = Customization.objects.get(name=self.customization_name)
        site = ZendeskSite.objects.filter(customization=customization).first()
        labels = [ZendeskArticleLabel.objects.get_or_create(name=label, site=site)[0] for label in zenpy_article.label_names]
        zd_article.labels.set(labels)
        return zenpy_article

    @retry(block_final_exception=True)
    def sync_section(self, zd_section: ZendeskSection, delete=True):
        if not zd_section.sync:
            return None

        if delete and not zd_section.section_id:
            return None

        zenpy_section = None
        if zd_section.section_id:
            try:
                zenpy_section = self.zen_client.help_center.sections(id=zd_section.section_id)
            except RecordNotFoundException:
                zenpy_section = Section()

            if delete:
                if zenpy_section:
                    self.zen_client.help_center.sections.delete(zenpy_section)
                zd_section.needs_sync = False
                zd_section.save()
                return None
        else:
            zenpy_section = Section()

        zenpy_section.category_id = zd_section.get_parent_category_id()
        zenpy_section.parent_section_id = getattr(zd_section.parent_section, 'section_id', None)
        zenpy_section.position = zd_section.position
        zenpy_section.name = zd_section.name

        if not zenpy_section.id:
            zenpy_section = self.zen_client.help_center.sections.create(zenpy_section)
            zd_section.section_id = zenpy_section.id
        else:
            zenpy_section = self.zen_client.help_center.sections.update(zenpy_section)

        zenpy_translation = next(filter(
            lambda translation: translation.locale == 'en-us',
            self.zen_client.help_center.sections.translations(zenpy_section)
        ), None)
        if zenpy_translation:
            zenpy_translation.title = zd_section.name
            self.zen_client.help_center.sections.update_translation(zenpy_section, zenpy_translation)
        else:
            zenpy_translation = Translation(title=zd_section.name)
            self.zen_client.help_center.sections.create_translation(zenpy_section, zenpy_translation)

        zd_section.needs_sync = False
        zd_section.save()
        return zenpy_section

    @retry(block_final_exception=True)
    def sync_category(self, zd_category: ZendeskCategory, delete=False):
        if not zd_category.sync:
            return None

        if delete and not zd_category.category_id:
            return None

        if zd_category.category_id:
            zenpy_category = self.zen_client.help_center.categories(id=zd_category.category_id)
            if delete:
                if zenpy_category:
                    self.zen_client.help_center.categories.delete(zenpy_category)
                return None
        else:
            zenpy_category = Category(name=zd_category.name, locale='en-us')

        if not zenpy_category.id:
            zenpy_category = self.zen_client.help_center.categories.create(zenpy_category)
            zd_category.category_id = zenpy_category.id
            zd_category.save()
        else:
            zenpy_category = self.zen_client.help_center.categories.update(zenpy_category)

        zenpy_translation = next(filter(
            lambda translation: translation.locale == 'en-us',
            self.zen_client.help_center.categories.translations(zenpy_category)
        ), None)
        if zenpy_translation:
            zenpy_translation.title = zd_category.name
            self.zen_client.help_center.categories.update_translation(zenpy_category, zenpy_translation)
        else:
            zenpy_translation = Translation(title=zd_category.name)
            self.zen_client.help_center.categories.create_translation(zenpy_category, zenpy_translation)
        return zenpy_category


def push_accepted_article_to_zendesk(asset, customization_name=settings.CUSTOMIZATION):
    cloud_portal = get_cloud_portal_asset(customization_name)
    if not cloud_portal.read_global_value('%ZENDESK_SYNC_ARTICLES%'):
        return

    zd_articles = list(ZendeskArticle.objects.filter(asset=asset, sync=True))
    if not zd_articles:
        return

    lang = Language.objects.filter(code='en_US').first()
    doc_json = generate_doc_json([asset], lang, external_link=True)[0]
    exporter = Exporter(customization_name=customization_name, cloud_portal=cloud_portal)
    for zd_article in zd_articles:
        if zd_article.sync and zd_article.menu_sync_enabled:
            zd_article.needs_sync = True
            node = zd_article.menu_node
            site = ZendeskSite.objects.filter(customization__name=customization_name).first()

            if site:
                sync_log = ZendeskSyncLog(menu=node.get_parent(), zendesk_site=site,
                    zendesk_category=ZendeskCategory.objects.filter(
                        category_id=zd_article.section.get_parent_category_id()).first())
                sync_log.save()
                review_id = node.asset.version_id(customization_name)
                if not zd_article.section.section_id:
                    zd_section = exporter.sync_section(zd_article.section, delete=False)
                    zd_article.section.section_id = zd_section.id
                    zd_article.section.save()
                review = AssetCustomizationReview.objects.filter(version=review_id).first()
                sync_item = ZendeskSyncItem(
                        menu_node=node, asset_id=node.asset_id, zendesk_section_id=zd_article.section_id, zendesk_article=zd_article, sync_log=sync_log, review=review)
                sync_item.save()
                try:
                    exporter.sync_article(zd_article, doc_json, sync_log=sync_log)
                    sync_item.mark_completed()
                except Exception as e:
                    tb = traceback.format_exc()
                    sync_item.mark_failed(f'{type(e).__name__}: {e}\n trace: {tb}')


def update_zd_section(node: MenuNode, site: ZendeskSite, parent_zd: ZendeskCategory or ZendeskSection,
                      exporter: Exporter, customization: Customization, position: int, parent_enabled=True):
    zd_section = node.zendesksection_set.filter(site=site).first()
    if not zd_section:
        zd_section = ZendeskSection(needs_sync=True)

    if not zd_section.needs_sync:
        return zd_section

    enabled = next((cust for cust in node.enabled_customizations if cust.id == customization.id), False)
    zd_section.name = node.name
    zd_section.menu_node = node
    zd_section.position = position
    zd_section.site = site
    if type(parent_zd) is ZendeskCategory:
        zd_section.parent_category = parent_zd
    elif type(parent_zd) is ZendeskSection:
        zd_section.parent_section = parent_zd
    zd_section.save()

    if zd_section.sync and parent_enabled:
        exporter.sync_section(zd_section, delete=not enabled)

    return zd_section


def update_zd_article(node: MenuNode, site: ZendeskSite, parent_section: ZendeskSection,
                      exporter: Exporter, customization: Customization, position: int, parent_enabled=True, zd_article: ZendeskArticle = None, force_update = False, custom_name=None, sync_log=None):
    """This generator yields a ZendeskArticle object as its first output then it outputs an boolean that indicates whether the article was successfully saved.
    A generator is being used to keep the logic of checking/creating a ZendeskArticle encapsulated but making the instance available to use outside the functions scope to be used to instantiate an ZendeskSyncItem. 
    """
    zd_article = zd_article or node.zendeskarticle_set.filter(site=site).first()
    new_article = False
    if not zd_article:
        new_article = True
        zd_article = ZendeskArticle(needs_sync=True)

    if not zd_article.needs_sync and not force_update:
        yield zd_article
        yield True
        return
    
    if not new_article:
        yield zd_article

    asset_accepted = node.asset.version_id(customization.name) != 0
    enabled = node.asset.customizations.filter(id=customization.id).exists()
    publish = enabled and asset_accepted
    zd_article.title = custom_name or node.name
    zd_article.menu_node = node
    zd_article.position = position
    zd_article.section = parent_section
    zd_article.site = site
    zd_article.draft = not publish
    zd_article.asset = node.asset
    zd_article.save()
    if zd_article.sync and parent_enabled:
        lang = Language.objects.filter(code='en_US').first()
        doc_json = None
        if publish:
            doc_json = generate_doc_json([node.asset], lang, external_link=True)[0]
        doc_json['title'] = custom_name or doc_json['title']
        zd_article.title = custom_name or doc_json['title'] if doc_json else node.asset.name
    if new_article:
        yield zd_article
    try:
        exporter.sync_article(zd_article, doc_json, delete=False, sync_log=sync_log)
    except Exception as e:
        tb = traceback.format_exc()
        yield f'{type(e).__name__}: {e}\n trace: {tb}'
    
    yield True


@background
def process_asset(site, customization, parent_zd, exporter, parent_enabled, zendesk_sync_log, force_update, position, node):
    zd_article = node.zendeskarticle_set.filter(site=site).first()
    review_id = node.asset.version_id(customization.name)
    review = AssetCustomizationReview.objects.filter(version=review_id).first()
    nodes_list = getattr(node, 'nodes_list', node.nodes.all())
    custom_title = f'{node.parent_node.name if node.parent_node else node.name}: Overview' if  node.asset and nodes_list else None
    position = 0 if custom_title else position
    if zendesk_sync_log and review and getattr(zd_article, 'sync', True):
        sync_id = None
        zendesk_section = isinstance(parent_zd, ZendeskSection) and parent_zd 
        if not zendesk_section:
            zendesk_section = parent_zd.general_section

        update_state = update_zd_article(node, site, zendesk_section, exporter, customization, position, parent_enabled, zd_article, force_update, custom_name=custom_title, sync_log=zendesk_sync_log)
        zd_article = next(update_state)
        zd_sync_item = ZendeskSyncItem(menu_node=node, asset=node.asset, zendesk_section=zendesk_section, zendesk_article=zd_article, sync_log=zendesk_sync_log, review=review)
        zd_sync_item.save()
        end_state = next(update_state)
        sync_id = sync_id or zd_sync_item.id
        sync_item = ZendeskSyncItem.objects.filter(id=sync_id).first()
        if not zd_article.latest_sync(zendesk_sync_log):
            sync_item.mark_canceled()
        elif not isinstance(end_state, str):
            sync_item.mark_completed()
        else:
            sync_item.mark_failed(end_state)

@background
def process_nodes(nodes: List[MenuNode], site: ZendeskSite, customization: Customization, parent_zd, exporter: Exporter,
                  parent_enabled=True, zendesk_sync_log: ZendeskSyncLog=None, force_update=False):
    position = 100
    for node in nodes:
        process_node(site, customization, parent_zd, exporter, parent_enabled, zendesk_sync_log, force_update, position, node)
        position += 100

    if type(parent_zd) in (ZendeskCategory, ZendeskSection):
        zd_sections = parent_zd.zendesksection_set.filter(menu_node=None)
        for zd_section in zd_sections:
            if zd_section.position:
                # Check position to prevent delete of generated general section
                if zd_section.section_id:
                    exporter.sync_section(zd_section, delete=True)
                zd_section.delete()

    if type(parent_zd) is ZendeskSection:
        zd_articles = parent_zd.zendeskarticle_set.filter(menu_node=None)
        for zd_article in zd_articles:
            if zd_article.article_id:
                exporter.sync_article(zd_article, delete=True, sync_log=zendesk_sync_log)
            zd_article.delete()

def process_node(site, customization, parent_zd, exporter, parent_enabled, zendesk_sync_log, force_update, position, node):
    enabled = next((cust for cust in node.enabled_customizations if cust.id == customization.id), False)
    nodes_list = getattr(node, 'nodes_list', node.nodes.all())
    zd_section = None
    if nodes_list:
        zd_section = update_zd_section(node, site, parent_zd, exporter, customization, position, parent_enabled)
        process_nodes(nodes_list, site, customization, zd_section, exporter, enabled, zendesk_sync_log, force_update)
    if node.asset:
        zd_section = zd_section or isinstance(parent_zd, ZendeskSection) and parent_zd
        if not zd_section:
            zd_section = parent_zd.general_section
        process_asset(site, customization, zd_section, exporter, parent_enabled, zendesk_sync_log, force_update, position, node)
    else:
        node_article = node.zendeskarticle_set.filter(position=0).first()
        if node_article:
            exporter.sync_article(node_article, delete=True, sync_log=zendesk_sync_log)
        zd_section = node.zendesksection_set.first()
        if zd_section and not nodes_list:
            exporter.sync_section(zd_section, delete=True)


def update_customization_structure(menu: Menu, site: ZendeskSite, customization_name: str = settings.CUSTOMIZATION, sync_log = None, force_update = True):
    exporter = Exporter(customization_name=customization_name)
    customization = Customization.objects.get(name=customization_name)
    zd_category = menu.zendeskcategory_set.filter(site=site).first()
    if zd_category:
        general_section_title = zd_category.general_section_title
        nodes_list = menu.prefetch_menu().nodes_list
        top_level_assets = [node.asset for node in nodes_list if node.asset]
        general_section = ZendeskSection.objects.filter(name=general_section_title).first()
        if not general_section:
            general_section = ZendeskSection(site=site, parent_category=zd_category, position=0, name=general_section_title, sync=True, needs_sync=True)
            general_section.save()
        exporter.sync_section(general_section, delete=not top_level_assets)
        general_section = zd_category.zendesksection_set.filter(name=zd_category.general_section_title).first()
        for general_article in general_section.zendeskarticle_set.exclude(asset__in=top_level_assets):
            if general_article.article_id:
                exporter.sync_article(general_article, delete=True, sync_log=sync_log)
            general_article.delete()
        process_nodes(nodes_list, site, customization, zd_category, exporter, menu.zendesk_sync_enabled, zendesk_sync_log=sync_log, force_update=force_update)


def sync_menu(menu: Menu, customizations: List[Customization] = None, force_update = True):
    """Iterates over each customization and runs an async task for each to sync with zendesk.

    Args:
        menu (Menu): Menu object to update 

    Yields:
        Generator[AsyncResult, None, None]: This can be used in the future for tracking task state
    """
    for customization in customizations or menu.zendesk_sync_enabled.all():
        site = ZendeskSite.objects.filter(customization=customization).first()
        if not site:
            continue
        zd_category = menu.zendeskcategory_set.filter(site=site).first()
        if not zd_category:
            zd_category = ZendeskCategory(site=site, menu=menu, name=menu.name)
            zd_category.save()
        log = ZendeskSyncLog(menu=menu, zendesk_site=site, zendesk_category=zd_category)
        log.save()
        task = async_zendesk_sync.apply_async(args=[menu.id, customization.name, log.id, force_update])   
        yield task.task_id
            

