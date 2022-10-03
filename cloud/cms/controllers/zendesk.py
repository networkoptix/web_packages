import traceback
import sys
from cms.tasks import async_zendesk_sync
from cms.controllers import documentation
from cms.controllers import modify_db
from cms.controllers import structure
from cms import forms
from cms.models import *
from util.helpers import substitute_branding

from django.conf import settings
from django.utils.http import urlencode

import logging
import re
import uuid
import time
import threading
from functools import wraps
from typing import List
from zenpy import Zenpy
from zenpy.lib.api_objects.help_centre_objects import Category, Section, Article, Translation, Label
from zenpy.lib.exception import APIException, RecordNotFoundException, ZenpyException

logger = logging.getLogger(__name__)


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
    _branding, hidden_branding = forms.get_branding_shortcuts()
    branding = _branding + hidden_branding
    rep = {re.escape(value): ds['name'] for ds, value in branding}
    rep[re.escape('Nx Cloud')] = '%CLOUD_NAME%'
    rep[re.escape('Nx Meta')] = '%VMS_NAME%'
    return rep


class CategoryNotFoundException(Exception):
    pass


class ZendeskNotConfigured(Exception):
    pass

test_background_decorator = False

def background(f):
    '''
    a threading decorator
    use @background above the function you want to run in the background
    '''
    @wraps(f)
    def background_func(*args, **kwargs):
        threading.Thread(target=f, args=args, kwargs=kwargs).start()

    return background_func


def retry(exception_to_retry=Exception, retries=3, delay=3, backoff=2, block_final_exception=False):
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
                    message = f'{err}, Retrying in {next_delay} seconds...'
                    if logger:
                        logger.warning(message)

                    time.sleep(next_delay)
                    next_delay *= backoff
            else:
                if not block_final_exception:
                    return func_to_retry(*args, **kwargs)

                try:
                    return func_to_retry(*args, **kwargs)
                except exception_to_retry as err:
                    message = f"Failed after {retries} retries. {args}"
                    if logger:
                        logger.warning(message)

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
        self.asset_type = AssetType.objects.get(
            name='', type=AssetType.ASSET_TYPES.documentation)
        self.user = user

    def _process_sections(self, sections):
        return [
            self._process_section(section)
            for section in sorted(sections, key=item_position)
        ]

    def _get_articles(self, section):
        return sorted(
            self.zen_client.help_center.articles.search(
                section=section.id
            ), key=item_position)

    def _get_sections(self, section):
        return self._process_sections(list(filter(
            lambda x: x.parent_section_id == section.id, self.all_sections)))

    def _process_section(self, section):
        return {
            'object': section,
            'articles': self._get_articles(section),
            'sections': self._get_sections(section)
        }

    def _pull_category_from_zendesk(self):
        categories = self.zen_client.help_center.categories()
        target_category = next((
            category for category in categories if category.name == self.category_name
        ), None)
        if not target_category:
            raise CategoryNotFoundException
        self.all_sections = list(
            self.zen_client.help_center.categories.sections(
                category_id=target_category.id))
        first_level_sections = list(filter(
            lambda section: section.parent_section_id is None,
            self.all_sections
        ))
        section_list = self._process_sections(first_level_sections)

        return {'category': target_category, 'sections': section_list}

    @staticmethod
    def sub_image_sources(files_target, branding):
        def _sub_image_sources(match_obj):
            file_id = str(uuid.uuid4())
            try:
                files_target[file_id] = structure.external_file_to_content_file(match_obj[2], branding)
            except Exception as e:
                tag = match_obj[1]
                url = match_obj[2]
                return f'{tag}src="{url}"'

            return f'{match_obj[1]}src="{{image_import:{file_id}}}"'

        return _sub_image_sources

    def _get_data_records(self, article, body):
        image_sources = ['%ZENDESK_DOMAIN%']
        files = {}
        data_records = {
            'title': substitute_branding(self.branding, article.title),
            'body': re.sub(r'(<img[^>]*?)src="(.*?)"', Importer.sub_image_sources(files, {val: key for key, val in self.branding.items() if val in image_sources}), body),
            'labels': ', '.join(set(article.label_names))
        }
        return data_records, files

    def _article_save_records(self, article, asset):
        context_model = Context.objects.get(
            asset_type=self.asset_type, name='content')
        body = substitute_branding(self.branding, article.body)
        data_records, files = self._get_data_records(article, body)
        modify_db.save_unrevisioned_records(
            asset, context_model, None, context_model.datastructure_set.all(), data_records, files, self.user)

    def _update_zendesk_article(self, article, zd_article):
        zd_article.author_id = article.author_id
        zd_article.comments_disabled = article.comments_disabled
        zd_article.draft = article.draft
        zd_article.edited_at = article.edited_at
        zd_article.html_url = article.html_url
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
            site=self.site,
            section=section,
            menu_node=menu_node,
            asset=asset,
            article=article
        )
        labels = [
            ZendeskArticleLabel.objects.get_or_create(
                name=label_name, site=self.site
            )[0]
            for label_name in article.label_names
        ]

        zd_article.labels.set(labels)

    def _update_or_create_menu_node(self, parent_menu_node, name, section):
        if parent_menu_node:
            menu_node, created = MenuNode.objects.get_or_create(
                name=name, parent_node=parent_menu_node)

        else:
            menu_node, created = MenuNode.objects.get_or_create(
                name=name, parent_menu=self.menu)

        menu_node.order = section['object'].position
        menu_node.save()

        if created:
            menu_node.enabled.set(self.all_customizations)

        return menu_node

    def _update_or_create_section(self, section_object, menu_node, parent_section):
        zd_section = ZendeskSection.objects.get_or_create(
            section_id=section_object.id, parent_category=self.category, site=self.site, menu_node=menu_node,
            parent_section=parent_section
        )[0]
        zd_section.name = section_object.name
        zd_section.position = section_object.position
        zd_section.save()
        return zd_section

    def _update_or_create_article_node(self, article, menu_node, zd_section):
        article_menu_node, article_node_created = MenuNode.objects.get_or_create(
            name=substitute_branding(self.branding, article.title), parent_node=menu_node,
        )
        article_menu_node.order = article.position
        article_menu_node.save()

        if article_node_created or not article_menu_node.asset:
            self._add_article_to_menu_node(article_menu_node, article)

        zd_article = ZendeskArticle.objects.filter(
            section=zd_section, article_id=article.id, asset=article_menu_node.asset
        ).first()

        return zd_article, article_menu_node

    def _add_article_to_menu_node(self, article_menu_node, article):
        article_menu_node.enabled.set(self.all_customizations)
        article_asset = Asset.objects.create(
            asset_type=self.asset_type, name=substitute_branding(
                self.branding, article.title)
        )
        article_asset.customizations.set(self.all_customizations)
        article_menu_node.asset = article_asset
        article_menu_node.save()

    def _handle_update_zd_article(self, zd_article, article, article_menu_node, zd_section):
        if not zd_article:
            self._create_zendesk_article(
                article, article_menu_node.asset, zd_section, article_menu_node)
        else:
            self._update_zendesk_article(article, zd_article)

    def _save_article(self, article, menu_node, zd_section):
        zd_article, article_menu_node = self._update_or_create_article_node(
            article, menu_node, zd_section)
        self._handle_update_zd_article(
            zd_article, article, article_menu_node, zd_section)
        self._article_save_records(article, article_menu_node.asset)

    def _create_zendesk_sections(self, sections, parent_section=None, parent_menu_node=None):
        for section in sections:
            section_object = section['object']
            name = substitute_branding(self.branding, section_object.name)
            menu_node = self._update_or_create_menu_node(
                parent_menu_node, name, section)
            zd_section = self._update_or_create_section(
                section_object, menu_node, parent_section)

            for article in section['articles']:
                self._save_article(article, menu_node, zd_section)

            self._create_zendesk_sections(
                section['sections'], parent_section=zd_section, parent_menu_node=menu_node
            )

    def import_knowledgebase(self, menu, category_name, customization_name=settings.CUSTOMIZATION):
        self.menu = menu
        self.category_name = category_name
        self.customization = Customization.objects.get(
            name=customization_name)
        self.site = ZendeskSite.objects.get_or_create(
            customization=self.customization)[0]
        self.branding = generate_branding_dict()
        struct = self._pull_category_from_zendesk()
        self.category = ZendeskCategory.objects.get_or_create(
            site=self.site, menu=menu, name=struct['category'].name, category_id=struct['category'].id
        )[0]
        self._create_zendesk_sections(struct['sections'])


class ZendeskBase:
    def __init__(self, customization_name=settings.CUSTOMIZATION, cloud_portal=None, default_permission_group_id=None):
        self.customization_name = customization_name
        self.cloud_portal = cloud_portal or get_cloud_portal_asset(
            self.customization_name)
        domain = self.cloud_portal.read_global_value('%ZENDESK_DOMAIN%')
        api_key = self.cloud_portal.read_global_value('%ZENDESK_API_KEY%')
        email = self.cloud_portal.read_global_value('%ZENDESK_API_EMAIL%')
        self.default_permission_group_id = default_permission_group_id or self.cloud_portal.read_global_value(
            '%ZENDESK_PERM_GROUP_ID%')
        if not domain or not api_key:
            raise ZendeskNotConfigured
        domain_parts = domain.split('.')
        if len(domain_parts) < 3:
            subdomain = ''
        else:
            domain = f'{domain_parts[-2]}.{domain_parts[-1]}'
            subdomain = '.'.join(domain_parts[:-2])
        self.zen_client = Zenpy(
            domain=domain, subdomain=subdomain, token=api_key, email=email)


class ZendeskMapper(ZendeskBase):
    struct = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site = ZendeskSite.objects.get_or_create(
            customization=Customization.objects.filter(name=self.customization_name).first())[0]
        self.zd_categories = ZendeskCategory.objects.filter(site=self.site)
        self.zd_sections = ZendeskSection.objects.filter(site=self.site)
        self.zd_articles = ZendeskArticle.objects.filter(site=self.site)

    def _get_query_params(self, category_id, section_id, label, item):
        parent_category_pk = getattr(self.zd_categories.filter(
            category_id=category_id).first(), 'pk', None)
        parent_section_pk = getattr(self.zd_sections.filter(
            section_id=section_id).first(), 'pk', None)
        is_article = label == 'article'
        fields_from_article = 'author_id', 'created_at', 'edited_at', 'html_url', 'title', 'updated_at', 'user_segment_id'
        article_params = {
            field: getattr(item, field, None) for field in fields_from_article
        } if is_article else {}

        if is_article:
            article_params['labels'] = ','.join(
                str(getattr(ZendeskArticleLabel.objects.filter(site=self.site, name=label).first(), 'id', ZendeskArticleLabel.objects.create(site=self.site, name=label).id)) for label in item.label_names)

        return {
            k: v for k, v in
            {
                f'{label}_id': item.id,
                'name': item.name,
                'site': self.site.id,
                'parent_category': parent_category_pk,
                'section': parent_section_pk,
                'parent_section': parent_section_pk,
                'permission_group_id': self.default_permission_group_id,
                'position': getattr(item, 'position', None),
                **article_params
            }.items()
            if v is not None
        }

    def _map_item(self, item, label):
        section_id = getattr(item, 'parent_section_id',
                             None) or getattr(item, 'section_id', None)
        category_id = getattr(item, 'category_id', None)
        admin_url, zd_admin_url, asset_url = self._get_admin_urls(
            item.id, label)
        query_params = self._get_query_params(
            category_id, section_id, label, item)

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
                {'title': 'Menu' if label == 'category' else 'Menu Node',
                    'url': admin_url,  'class': 'primary'},
                {'title': f'Zendesk {label.title()}', 'url': zd_admin_url,
                 'class': 'primary'},
                {'title': f'Asset', 'url': asset_url,  'class': 'primary'},
                {'title': 'Zendesk Links', 'label': True, 'class': 'push-right'},
                {'title': f'{label.title()} HTML', 'url': item.html_url,
                 'class': 'info'},
                {'title': f'{label.title()} JSON', 'url': item.url,  'class': 'info'}
            ],
            'children': []
        }

    def _get_article_admin_url(self, label, item_id):
        if label != 'article':
            return

        existing = self.zd_articles.filter(article_id=item_id).first()
        if existing:
            return (existing.menu_node.admin_link if existing.menu_node else ''), existing.admin_link, existing.asset.admin_link

    def _get_section_admin_url(self, label, item_id):
        if label != 'section':
            return

        existing = self.zd_sections.filter(section_id=item_id).first()
        if existing:
            return getattr(existing.menu_node, 'admin_link', None), existing.admin_link, None

    def _get_category_admin_url(self, label, item_id):
        if label != 'category':
            return

        existing = self.zd_categories.filter(category_id=item_id).first()
        if existing:
            return getattr(existing.menu, 'admin_link', None), existing.admin_link, None

    def _get_admin_urls(self, item_id, label):
        fallback = (None, None, None)
        url_getters = [
            self._get_article_admin_url,
            self._get_section_admin_url,
            self._get_category_admin_url
        ]

        return next((
            admin_url for getter in url_getters
            if (admin_url := getter(label, item_id))
        ), fallback)

    def _map_and_sort(self, res, label):
        return sorted([self._map_item(item, label) for item in res], key=lambda item: item['position'])

    def _get_categories(self):
        return self._map_and_sort(self.zen_client.help_center.categories(), 'category')

    def _get_sections(self):
        return self._map_and_sort(self.zen_client.help_center.sections(), 'section')

    def _get_articles(self):
        return self._map_and_sort(self.zen_client.help_center.articles(), 'article')

    def build_struct(self):
        categories = {category['zendesk_category_id']
            : category for category in self._get_categories()}
        sections = {section['zendesk_section_id']
            : section for section in self._get_sections()}
        articles = self._get_articles()

        for article in articles:
            sections[article['section_id']]['children'].append(article)
            if not sections[article['section_id']]['admin_url']:
                sections[article['section_id']]['admin_url'] = sections[article['section_id']
                                                                        ]['links'][2]['url'] = article['admin_url']

        for section in sections.values():
            categories[section['category_id']]['children'].append(section)
        self.struct = sorted(categories.values(),
                             key=lambda category: category['position'])
        return self.struct

    def _parse_struct_for_unmapped_and_empty_nodes(self, nodes, unmapped={}, empty={}):
        current_node, *remaining_nodes = nodes

        unmapped = unmapped or {
            'customization': self.site.customization.name,
            'category': [],
            'section': [],
            'article': []
        }

        empty = empty or {
            'customization': self.site.customization.name,
            'category': [],
            'section': []
        }

        children = current_node['children']
        type = current_node['type']

        if not current_node['zd_admin_url']:
            unmapped[type].append(current_node[f'zendesk_{type}_id'])

        if children:
            self._parse_struct_for_unmapped_and_empty_nodes(
                children, unmapped, empty)

        elif type != 'article':
            empty[type].append(current_node[f'zendesk_{type}_id'])

        if remaining_nodes:
            self._parse_struct_for_unmapped_and_empty_nodes(
                remaining_nodes, unmapped, empty)

        return unmapped, empty

    def get_unmapped_and_empty(self, json_values=False):
        unmapped_nodes, empty_nodes = self._parse_struct_for_unmapped_and_empty_nodes(
            self.struct or self.build_struct())

        return {
            'unmapped': json.dumps(unmapped_nodes) if json_values else unmapped_nodes,
            'empty': json.dumps(empty_nodes) if json_values else empty_nodes
        }

    @background
    @retry(block_final_exception=True)
    def _clean_category(self, category_id):
        self.zen_client.help_center.categories.delete(Category(id=category_id))

    @background
    @retry(block_final_exception=True)
    def _clean_section(self, section_id):
        self.zen_client.help_center.sections.delete(Section(id=section_id))

    @background
    @retry(block_final_exception=True)
    def _clean_article(self, article_id):
        self.zen_client.help_center.articles.archive(Article(id=article_id))

    def clean_zd(self, items_to_remove):
        for category in items_to_remove.pop('category', []):
            self._clean_category(category)

        for section in items_to_remove.pop('section', []):
            self._clean_section(section)

        for article in items_to_remove.pop('article', []):
            self._clean_article(article)


class Exporter(ZendeskBase):
    debug = False

    def _check_and_get_zenpy_article(self, zd_article, sync_log, delete):
        zenpy_article = None
        if not zd_article.latest_sync(sync_log):
            sync_item = ZendeskSyncItem.objects.filter(
                zendesk_article=zd_article, sync_log=sync_log).first()
            if sync_item:
                sync_item.mark_canceled()
            return
        if not zd_article.sync:
            return

        if delete and not zd_article.article_id:
            return
        zenpy_article = None
        if zd_article.article_id:
            try:
                zenpy_article = self.zen_client.help_center.articles(
                    id=zd_article.article_id)
            except RecordNotFoundException:
                zd_article.article_id = None

            if delete:
                if zenpy_article and not self.debug:
                    try:
                        self.zen_client.help_center.articles.archive(
                            zenpy_article)
                    except RecordNotFoundException:
                        pass

                zd_article.needs_sync = False
                zd_article.save()
                return

            return zenpy_article or Article()

        return Article()

    def _update_zenpy_from_zd_article(self, zenpy_article, zd_article):
        zenpy_article.position = zd_article.position
        zenpy_article.author_id = zd_article.author_id
        zenpy_article.section_id = zd_article.section.section_id
        zenpy_article.promoted = zd_article.promoted
        zenpy_article.comments_disabled = zd_article.comments_disabled
        zenpy_article.permission_group_id = zd_article.permission_group_id or self.default_permission_group_id
        zenpy_article.user_segment_id = zd_article.user_segment_id
        zenpy_article.draft = zd_article.draft
        zenpy_article.title = zd_article.title or zd_article.asset.name

        if self.debug:
            return zenpy_article

        if not zenpy_article.id:
            try:
                zenpy_article = self.zen_client.help_center.articles.create(
                    zd_article.section.section_id, zenpy_article)
            except RecordNotFoundException:
                zenpy_section = self.sync_section(zd_article.section, delete=False)
                zenpy_article = self.zen_client.help_center.articles.create(
                    zenpy_section.id, zenpy_article)

        else:
            try:
                zenpy_article = self.zen_client.help_center.articles.update(
                    zenpy_article)
            except RecordNotFoundException:
                zenpy_article = self.zen_client.help_center.articles.create(
                    zd_article.section.section_id, zenpy_article)

        return zenpy_article

    def _update_zd_article_with_zenpy_data(self, zd_article, zenpy_article):
        zd_article.author_id = zenpy_article.author_id
        zd_article.created_at = zenpy_article.created_at
        zd_article.edited_at = zenpy_article.edited_at
        zd_article.updated_at = zenpy_article.updated_at
        zd_article.html_url = zenpy_article.html_url
        zd_article.article_id = zenpy_article.id
        zd_article.user_segment_id = zenpy_article.user_segment_id
        zd_article.permission_group_id = zenpy_article.permission_group_id
        zd_article.save()

    def _update_zendesk_translation(self, zd_article, zenpy_article):
        zenpy_translation: Translation = next(filter(
            lambda translation: translation.locale == 'en-us',
            self.zen_client.help_center.articles.translations(zenpy_article)
        ), None)
        if not zenpy_translation:
            zenpy_translation = Translation(
                source_id=zenpy_article.id, locale='en-us', source_type='Article')
        zenpy_translation.draft = zd_article.draft
        zenpy_translation.title = zd_article.title or zd_article.asset.name
        return zenpy_translation

    def _get_update_attachment_handler(self, existing_attachments, zenpy_article, portal_url, asset):
        def _handler(body, file_info):
            attachment = next(filter(lambda attachment: attachment.file_name ==
                                    file_info['external_file_name'], existing_attachments), None)
            external_file = ExternalFile.objects.get(id=file_info['id'])
            original = f'/{file_info["original_url"]}'

            if attachment:
                existing_attachments.remove(attachment)
            elif not self.debug:
                try:
                    attachment = self.zen_client.help_center.attachments.create(
                        zenpy_article, external_file.file.file, inline=True, file_name=file_info['external_file_name'])
                except (ZenpyException, ValueError, OSError, APIException) as exception:
                    # ZenpyException: Most likely from a file being too large.
                    # ValueError or OSError: Most likely an ExternalFile is missing it's file.
                    logger.warning(f'Error creating attachment. Asset: {asset.id}'
                                   f'Zenpy Article ID: {zenpy_article.id}, '
                                   f'Ext File ID: {external_file.id}, '
                                   f'File name: {file_info["external_file_name"]}, '
                                   f'Exception: {exception}')
                    return

            # Use zendesk url if attachment was created else link to cloud portal
            replacement = attachment.relative_path if getattr(
                attachment, 'id', False) else f"{portal_url}{original}"

            if not self.debug and original not in body:
                try:
                    self.zen_client.help_center.attachments.delete(attachment)
                except RecordNotFoundException as exception:
                    # Handle deleting none existing attachment
                    logger.warning(f'Error deleting attachment. Attachment Id: {attachment and attachment.id}, '
                                   f'Exception: {exception}')
                    return

            return body.replace(original, replacement)

        return _handler

    def _update_body_with_attachments(self, content, zenpy_article, portal_url, asset):
        attachments_changed = False
        body = '<br>'.join(block['contentHTML'] for block in content['blocks'])
        existing_attachments = list(
            self.zen_client.help_center.attachments(zenpy_article.id))
        update_attachment = self._get_update_attachment_handler(existing_attachments, zenpy_article, portal_url, asset)

        for file_info in content.get('external_files', []):
            if updated_body := update_attachment(body, file_info):
                body = updated_body
                attachments_changed = True
        return existing_attachments, body, attachments_changed

    def _clean_attachments(self, existing_attachments):
        if self.debug:
            return

        for attachment in existing_attachments:
            self.zen_client.help_center.attachments.delete(attachment)

    def _update_attachments_from_content(self, zd_article, zenpy_article, content):
        if not content:
            return

        from util.config import get_config
        conf = get_config(zd_article.site.customization.name)
        portal_url = conf["cloud_portal"]["url"]

        abandoned_attachments, updated_body, attachments_changed = self._update_body_with_attachments(
            content, zenpy_article, portal_url, zd_article.asset)

        if abandoned_attachments:
            self._clean_attachments(abandoned_attachments)
            attachments_changed = True

        zd_article.title = content['title']

        labels_changed = set(content['labels']) != set(
            zenpy_article.label_names)
        zenpy_article.label_names = content['labels']
        if labels_changed:
            existing_labels = set(ZendeskArticleLabel.objects.filter(site=zd_article.site).values_list('name', flat=True))
            new_labels = set(zenpy_article.label_names).difference(existing_labels)
            for new_label in new_labels:
                label = Label(name=new_label)
                if not self.debug:
                    self.zen_client.help_center.labels.create(zenpy_article, label)
        if not self.debug and (labels_changed or attachments_changed):
            self.zen_client.help_center.articles.update(zenpy_article)

        title = zd_article.title or zd_article.asset.name

        return updated_body, title

    def _update_or_create_article_translation(self, zenpy_article, zenpy_translation):
        if self.debug:
            return

        if zenpy_translation.id:
            self.zen_client.help_center.articles.update_translation(
                zenpy_article, zenpy_translation)
        else:
            self.zen_client.help_center.articles.create_translation(
                zenpy_article, zenpy_translation)

    def _update_labels(self, zd_article, zenpy_article):
        customization = Customization.objects.get(name=self.customization_name)
        site = ZendeskSite.objects.filter(customization=customization).first()
        labels = [ZendeskArticleLabel.objects.get_or_create(
            name=label.name, label_id=label.id, site=site)[0] for label in self.zen_client.help_center.articles.labels(zenpy_article)]
        zd_article.labels.set(labels)

        return labels

    @retry()
    def sync_article(self, zd_article: ZendeskArticle, content=None, delete=False, sync_log=None):
        if not (initial_zenpy_article := self._check_and_get_zenpy_article(zd_article, sync_log, delete)):
            return

        zenpy_article = self._update_zenpy_from_zd_article(
            initial_zenpy_article, zd_article)

        # Update cloud portal record with current zendesk data
        self._update_zd_article_with_zenpy_data(zd_article, zenpy_article)

        # Update translation for actual content
        zenpy_translation = self._update_zendesk_translation(
            zd_article, zenpy_article)

        # Update attachments
        if updated := self._update_attachments_from_content(zd_article, zenpy_article, content):
            body, title = updated
            zenpy_translation.body = body
            zenpy_translation.title = title

        self._update_or_create_article_translation(
            zenpy_article, zenpy_translation)

        zd_article.needs_sync = False
        zd_article.save()
        self._update_labels(zd_article, zenpy_article)

        return zenpy_article

    def _check_and_get_zenpy_section(self, zd_section, delete):
        no_section_to_delete = delete and not zd_section.section_id
        if not zd_section.sync or no_section_to_delete:
            return
        zenpy_section = Section()
        if zd_section.section_id:
            try:
                zenpy_section = self.zen_client.help_center.sections(
                    id=zd_section.section_id)
            except RecordNotFoundException:
                zd_section.section_id = None
                zd_section.save()

            if delete and not self.debug:
                if zenpy_section.id:
                    self.zen_client.help_center.sections.delete(zenpy_section)
                zd_section.needs_sync = False
                zd_section.save()
                return
        elif general_title := getattr(zd_section.parent_category, 'general_section_title', None):
            return next(filter(lambda section: section.category_id == zd_section.parent_category.category_id and section.name == general_title, self.zen_client.help_center.sections()), zenpy_section)

        return zenpy_section

    def _update_zenpy_section_from_data(self, zenpy_section, zd_section):
        zd_section = ZendeskSection.objects.get(id=zd_section.id)
        zenpy_section.category_id = zd_section.get_parent_category_id()
        zenpy_section.parent_section_id = getattr(
            zd_section.parent_section, 'section_id', None)
        zenpy_section.position = zd_section.position
        zenpy_section.name = zd_section.name

        if zenpy_section.id:
            try:
                if not self.debug:
                    zenpy_section = self.zen_client.help_center.sections.update(
                        zenpy_section)
                return self._update_zd_and_return_zenpy(zenpy_section, zd_section)

            except RecordNotFoundException:
                zenpy_section.id = None
        if not self.debug:
            zenpy_section = self.zen_client.help_center.sections.create(
                zenpy_section)
        return self._update_zd_and_return_zenpy(zenpy_section, zd_section)

    def _update_zd_and_return_zenpy(self, zenpy_section, zd_section):
        zd_section.section_id = zenpy_section.id
        zd_section.save()
        return zenpy_section

    def _get_section_translation(self, zenpy_section):
        return next(filter(
            lambda translation: translation.locale == 'en-us',
            self.zen_client.help_center.sections.translations(zenpy_section)
        ), None)

    def _update_or_create_zenpy_section_translation(self, zenpy_section, zd_section, zenpy_translation):
        if zenpy_translation:
            zenpy_translation.title = zd_section.name
            try:
                if not self.debug:
                    self.zen_client.help_center.sections.update_translation(
                        zenpy_section, zenpy_translation)
                return zenpy_translation

            except RecordNotFoundException:
                pass

        zenpy_translation = Translation(title=zd_section.name)
        if not self.debug:
            self.zen_client.help_center.sections.create_translation(
                zenpy_section, zenpy_translation)

        return zenpy_translation

    @retry(block_final_exception=True)
    def sync_section(self, zd_section: ZendeskSection, delete=True, return_zd_section=False):
        if not (initial_zenpy_section := self._check_and_get_zenpy_section(zd_section, delete)):
            return

        zenpy_section = self._update_zenpy_section_from_data(
            initial_zenpy_section, zd_section)

        zenpy_translation = self._get_section_translation(zenpy_section)

        self._update_or_create_zenpy_section_translation(
            zenpy_section, zd_section, zenpy_translation)

        zd_section.needs_sync = False
        zd_section.section_id = zenpy_section.id
        zd_section.save()
        return zd_section if return_zd_section else zenpy_section

    def _check_and_get_zenpy_category(self, zd_category, delete):
        zenpy_category = None
        no_category_to_delete = delete and not zd_category.category_id
        if not zd_category.sync or no_category_to_delete:
            return

        if zd_category.category_id:
            zenpy_category = self.zen_client.help_center.categories(
                id=zd_category.category_id)
            if delete:
                if not self.debug and zenpy_category:
                    self.zen_client.help_center.categories.delete(
                        zenpy_category)
                return

        return zenpy_category or Category(name=zd_category.name, locale='en-us')

    def _update_or_create_zenpy_category(self, zenpy_category, zd_category):
        if zenpy_category.id:
            try:
                if not self.debug:
                    zenpy_category = self.zen_client.help_center.categories.update(
                        zenpy_category)

                return zenpy_category

            except RecordNotFoundException:
                zenpy_category.id = None
        if not self.debug:
            zenpy_category = self.zen_client.help_center.categories.create(
                zenpy_category)
            zd_category.category_id = zenpy_category.id

        zd_category.save()

        return zenpy_category

    def _get_category_translation(self, zenpy_category):
        return next(filter(
            lambda translation: translation.locale == 'en-us',
            self.zen_client.help_center.categories.translations(zenpy_category)
        ), None)

    def _update_or_create_zenpy_category_translation(self, zenpy_category, zd_category, zenpy_translation):
        if zenpy_translation:
            zenpy_translation.title = zd_category.name
            try:
                if not self.debug:
                    self.zen_client.help_center.categories.update_translation(
                        zenpy_category, zenpy_translation)

                return zenpy_translation

            except RecordNotFoundException:
                zd_category.category_id = None

        zenpy_translation = Translation(title=zd_category.name)
        if not self.debug:
            self.zen_client.help_center.categories.create_translation(
                zenpy_category, zenpy_translation)

        return zenpy_translation

    @retry(block_final_exception=True)
    def sync_category(self, zd_category: ZendeskCategory, delete=False):
        if not (initial_zenpy_category := self._check_and_get_zenpy_category(zd_category, delete)):
            return

        zenpy_category = self._update_or_create_zenpy_category(
            initial_zenpy_category, zd_category)
        zenpy_translation = self._get_category_translation(zenpy_category)
        self._update_or_create_zenpy_category_translation(
            zenpy_category, zd_category, zenpy_translation)

        return zenpy_category


def sync_article(zd_article, doc_json, site, exporter):
    if zd_article.sync and zd_article.menu_sync_enabled:
        zd_article.needs_sync = True
        node = zd_article.menu_node

        if site:
            sync_log = ZendeskSyncLog(menu=node.get_parent(), zendesk_site=site,
                                      zendesk_category=ZendeskCategory.objects.filter(
                category_id=zd_article.section.get_parent_category_id()).first())
            sync_log.save()
            review_id = node.asset.version_id(site.customization.name)
            if not zd_article.section.section_id:
                zd_section = exporter.sync_section(
                    zd_article.section, delete=False)
                zd_article.section.section_id = zd_section.id
                zd_article.section.save()
            review = AssetCustomizationReview.objects.filter(
                version=review_id).first()
            sync_item = ZendeskSyncItem(
                menu_node=node, asset_id=node.asset_id, zendesk_section_id=zd_article.section_id, zendesk_article=zd_article, sync_log=sync_log, review=review)
            sync_item.save()
            try:
                exporter.sync_article(zd_article, doc_json, sync_log=sync_log)
                sync_item.mark_completed()
            except Exception as e:
                tb = traceback.format_exc()
                sync_item.mark_failed(f'{type(e).__name__}: {e}\n trace: {tb}')


def push_accepted_article_to_zendesk(asset, customization_name=settings.CUSTOMIZATION):
    cloud_portal = get_cloud_portal_asset(customization_name)
    sync_enabled = cloud_portal.read_global_value('%ZENDESK_SYNC_ARTICLES%')
    zd_articles = list(ZendeskArticle.objects.filter(asset=asset, sync=True))
    site = ZendeskSite.objects.filter(
        customization__name=customization_name).first()

    if not all([site, sync_enabled, zd_articles]):
        return

    lang = Language.objects.filter(code='en_US').first()
    doc_json = documentation.generate_doc_json([asset], lang, external_link=True, customization_name=customization_name)[0]
    exporter = Exporter(customization_name=customization_name,
                        cloud_portal=cloud_portal)

    for zd_article in zd_articles:
        sync_article(zd_article, doc_json, site, exporter)


def update_zd_section(node: MenuNode, site: ZendeskSite, parent_zd: ZendeskCategory or ZendeskSection,
                      exporter: Exporter, customization: Customization, position: int, parent_enabled=True):
    zd_section = node.zendesksection_set.filter(site=site).first()
    if not zd_section:
        zd_section = ZendeskSection(needs_sync=True)

    if not zd_section.needs_sync:
        return zd_section

    enabled = next(
        (cust for cust in node.enabled_customizations if cust.id == customization.id), False)
    zd_section.name = node.name
    zd_section.menu_node = node
    zd_section.position = position
    zd_section.site = site
    if type(parent_zd) is ZendeskCategory:
        zd_section.parent_category = parent_zd
    elif type(parent_zd) is ZendeskSection:
        zd_section.parent_section = parent_zd
    zd_section.save()

    if zd_section.sync:
        zd_section = exporter.sync_section(zd_section, delete=not enabled or not parent_enabled, return_zd_section=True)

    return zd_section


def update_zd_article(node: MenuNode, site: ZendeskSite, parent_section: ZendeskSection,
                      exporter: Exporter, customization: Customization, position: int, parent_enabled=True, zd_article: ZendeskArticle = None, force_update=False, custom_name=None, sync_log=None):
    """This generator yields a ZendeskArticle object as its first output then it outputs an boolean that indicates whether the article was successfully saved.
    A generator is being used to keep the logic of checking/creating a ZendeskArticle encapsulated but making the instance available to use outside the functions scope to be used to instantiate an ZendeskSyncItem.
    """
    zd_article = zd_article or node.zendeskarticle_set.filter(
        site=site).first()
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
    zd_article.menu_node = node
    if not zd_article.ignore_structure:
        zd_article.position = position
        zd_article.section = parent_section
    zd_article.site = site
    zd_article.draft = not publish
    zd_article.asset = node.asset
    doc_json = {}

    if zd_article.sync and parent_enabled:
        lang = Language.objects.filter(code='en_US').first()
        if publish:
            doc_json = documentation.generate_doc_json(
                [node.asset], lang, external_link=True, customization_name=customization.name)[0]
            doc_json['title'] = custom_name or doc_json.get('title', '')
        zd_article.title = doc_json.get('title') or node.name or node.asset.name

    zd_article.save()

    if new_article:
        yield zd_article
    try:
        exporter.sync_article(zd_article, doc_json,
                              delete=False, sync_log=sync_log)
    except Exception as e:
        tb = traceback.format_exc()
        yield f'{type(e).__name__}: {e}\n trace: {tb}'

    yield True


def check_if_article_can_sync(zendesk_sync_log, node):
    review_id = node.asset.version_id(
        zendesk_sync_log.zendesk_site.customization.name)
    review = AssetCustomizationReview.objects.filter(version=review_id).first()
    zd_article = node.asset.zendeskarticle_set.filter(
        site=zendesk_sync_log.zendesk_site).first() or node.zendeskarticle_set.filter(
        site=zendesk_sync_log.zendesk_site).first()
    sync_enabled = getattr(zd_article, 'sync', True)

    if all([zendesk_sync_log, sync_enabled]):
        return zd_article, review


@background
def process_asset(parent_zd, parent_enabled, zendesk_sync_log, force_update, position, node, cloud_portal=None):
    if not (result := check_if_article_can_sync(zendesk_sync_log, node)):
        return

    zd_article, review = result
    site = parent_zd.site
    customization = site.customization
    exporter = Exporter(customization_name=customization.name, cloud_portal=cloud_portal)
    nodes_list = getattr(node, 'nodes_list', node.nodes.all())
    custom_title = f'{node.parent_node.name if node.parent_node else node.name}: Overview' if node.asset and nodes_list else None
    position = 0 if custom_title else position
    sync_id = None
    zendesk_section = parent_zd if isinstance(
        parent_zd, ZendeskSection) else parent_zd.general_section
    update_state = update_zd_article(node, site, zendesk_section, exporter, customization, position,
                                     parent_enabled, zd_article, force_update, custom_name=custom_title, sync_log=zendesk_sync_log)
    zd_article = next(update_state)
    zd_sync_item = ZendeskSyncItem(menu_node=node, asset=node.asset, zendesk_section=zendesk_section,
                                   zendesk_article=zd_article, sync_log=zendesk_sync_log, review=review)
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
def process_nodes(nodes: List[MenuNode], parent_zd, parent_enabled=True, zendesk_sync_log: ZendeskSyncLog = None, force_update=False):
    site = zendesk_sync_log.zendesk_category.site if zendesk_sync_log else parent_zd.site
    exporter = Exporter(customization_name=site.customization.name)
    for _position, node in enumerate(nodes, 1):
        position = _position * 100
        process_node(parent_zd, parent_enabled, zendesk_sync_log,
                     force_update, position, node)

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
                exporter.sync_article(
                    zd_article, delete=True, sync_log=zendesk_sync_log)
            zd_article.delete()


def process_node(parent_zd, parent_enabled, zendesk_sync_log, force_update, position, node):
    site = zendesk_sync_log.zendesk_category.site
    customization = site.customization
    exporter = Exporter(customization_name=site.customization.name)
    enabled = parent_enabled and next(
        (cust for cust in node.enabled_customizations if cust.id == customization.id), False)
    zd_section = None
    if nodes_list := getattr(node, 'nodes_list', node.nodes.all()):
        zd_section = update_zd_section(
            node, site, parent_zd, exporter, customization, position, enabled)
        process_nodes(nodes_list, zd_section, enabled,
                      zendesk_sync_log, force_update)
    if node.asset:
        zd_section = zd_section or isinstance(
            parent_zd, ZendeskSection) and parent_zd
        if not zd_section:
            zd_section = zendesk_sync_log.zendesk_category.general_section
        process_asset(zd_section, parent_enabled,
                      zendesk_sync_log, force_update, position, node)
    else:
        if node_article := node.zendeskarticle_set.filter(position=0).first():
            exporter.sync_article(node_article, delete=True,
                                  sync_log=zendesk_sync_log)
        zd_section = node.zendesksection_set.first()
        if zd_section and not nodes_list or not enabled:
            exporter.sync_section(zd_section, delete=True)


def process_general_section_node(zd_category, nodes_list, sync_log):
    exporter = Exporter(customization_name=zd_category.site.customization.name)
    top_level_assets = [node.asset for node in nodes_list if node.asset]
    general_section_title = zd_category.general_section_title
    general_section = zd_category.zendesksection_set.filter(
        name=zd_category.general_section_title).first()
    if not general_section:
        general_section = ZendeskSection(
            site=zd_category.site, parent_category=zd_category, position=0, name=general_section_title, sync=True, needs_sync=True)
        general_section.save()
    exporter.sync_section(general_section, delete=not top_level_assets)
    for general_article in general_section.zendeskarticle_set.exclude(asset__in=top_level_assets):
        if general_article.article_id:
            exporter.sync_article(
                general_article, delete=True, sync_log=sync_log)
        general_article.delete()


def update_customization_structure(menu: Menu, site: ZendeskSite, sync_log=None, force_update=True):
    if zd_category := menu.zendeskcategory_set.filter(site=site).first():
        nodes_list = menu.prefetch_menu().nodes_list
        process_general_section_node(zd_category, nodes_list, sync_log)
        process_nodes(nodes_list, zd_category, menu.zendesk_sync_enabled.filter(id=site.customization_id).first(),
                      zendesk_sync_log=sync_log, force_update=force_update)


def sync_menu(menu: Menu, customizations: List[Customization] = None, force_update=True):
    """Iterates over each customization and runs an async task for each to sync with zendesk.

    Args:
        menu (Menu): Menu object to update

    Yields:
        Generator[AsyncResult, None, None]: This can be used in the future for tracking task state
    """
    for customization in customizations or menu.zendesk_sync_enabled.all():
        site, _ = ZendeskSite.objects.get_or_create(
            customization=customization)
        zd_category = menu.zendeskcategory_set.filter(site=site).first()
        if not zd_category:
            zd_category = ZendeskCategory(site=site, menu=menu, name=menu.name)
            zd_category.save()
        log = ZendeskSyncLog(menu=menu, zendesk_site=site,
                             zendesk_category=zd_category)
        log.save()
        task = async_zendesk_sync.apply_async(
            args=[menu.id, customization.name, log.id, force_update])
        yield task.task_id
