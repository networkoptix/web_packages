from cms.controllers.structure import external_file_to_content_file
from cms.controllers.modify_db import save_unrevisioned_records
from cms.forms import get_branding_shortcuts
from cms.models import Menu, MenuNode, Asset, ZendeskSite, ZendeskCategory, ZendeskSection, ZendeskArticle,\
    ZendeskArticleLabel, Customization, AssetType, Context

from django.conf import settings

import re
import uuid
from zenpy import Zenpy


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
    # Searches for any the keys from replacement dict
    # When one is found, the lambda function returns the value for that key and it is used as the replacement
    return re.sub("|".join(repl_dict.keys()), lambda match: repl_dict[re.escape(match.group(0))], text)


class CategoryNotFoundException(Exception):
    pass


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
        }
        files = {}
        data_records['body'] = re.sub(r'(<img[^>]*?)src="(.*?)"', sub_image_sources, data_records['body'])
        save_unrevisioned_records(asset, context_model, None, context_model.datastructure_set.all(), data_records,
                                  files, self.user)

    def _update_zendesk_article(self, article, zd_article):
        zd_article.author_id=article.author_id
        zd_article.comments_disabled=article.comments_disabled
        zd_article.draft=article.draft
        zd_article.edited_at=article.edited_at
        zd_article.html_url=article.html_url,
        zd_article.permission_group_id=article.permission_group_id
        zd_article.position=article.position
        zd_article.promoted=article.promoted
        zd_article.title=article.title
        zd_article.updated_at=article.updated_at
        zd_article.user_segment_id=article.user_segment_id
        zd_article.save()
        labels = []
        for label_name in article.label_names:
            labels.append(ZendeskArticleLabel.objects.get_or_create(name=label_name, site=self.site)[0])
        zd_article.labels.set(labels)

    def _create_zendesk_article(self, article, asset, section, menu_node):
        zd_article = ZendeskArticle.objects.create(
            site=self.site, section=section, menu_node=menu_node,
            article_id=article.id, author_id=article.author_id, comments_disabled=article.comments_disabled,
            created_at=article.created_at, draft=article.draft, edited_at=article.edited_at, html_url=article.html_url,
            permission_group_id=article.permission_group_id, position=article.position, promoted=article.promoted,
            title=article.title, updated_at=article.updated_at, user_segment_id=article.user_segment_id, asset=asset,
        )
        labels = []
        for label_name in article.label_names:
            labels.append(ZendeskArticleLabel.objects.get_or_create(name=label_name, site=self.site)[0])
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
