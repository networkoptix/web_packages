from functools import wraps
from bs4 import BeautifulSoup
from bs4.element import Tag
from django.conf import settings
from inlinestyler.utils import inline_css
import re
import sass
import logging
from bs4 import BeautifulSoup
from mistletoe import markdown
from html2text import HTML2Text
from waffle import switch_is_active
from cms.controllers.asset_json import get_review_matching_current_version, process_asset_global_contexts
from cms.feature_flags import SWITCHES
from meilisearch.errors import MeiliSearchCommunicationError, MeiliSearchApiError
from util.base_cache import BaseCache
from cms.controllers.filldata import global_contexts_to_dict, ContextProcessor
from cms.models import DataStructure, AssetType, AssetCustomizationReview, Context, get_cloud_portal_asset, Asset, ExternalFile
from util.helpers import get_meilisearch_client

logger = logging.getLogger(__name__)

def html2md(html):
    parser = HTML2Text()
    parser.ignore_images = True
    parser.ignore_links = True
    parser.body_width = 0
    return parser.handle(html)


def fixup_markdown_formatting(text):
    # Strip off table formatting
    text = re.sub(r'(^|\n)\|\s*', r'\1', text)
    # Strip off extra emphasis
    text = re.sub(r'\*\*', '', text)
    # Remove trailing whitespace and leading newlines
    text = re.sub(r' *$', '', text)
    text = re.sub(r'\n\n+', r'\n\n', text)
    return re.sub(r'^\n+', '', text)


def html2plain(html):
    md = html2md(html)
    html_simple = markdown(md)
    text = BeautifulSoup(html_simple).getText()
    return fixup_markdown_formatting(text)


# def ignore_index_not_found(func):
#     """Not sure if this needed anymore
#     """
#     @wraps(func)
#     def _ignore_index_not_found(*args, **kwargs):
#         try:
#             return func(*args, **kwargs)
#         except MeiliSearchApiError as e:
#             if e.error_code != 'index_not_found':
#                 raise e

#     return _ignore_index_not_found

class SearchableCache(BaseCache):
    def __init__(self, *args, **kwargs):
        self.custom_settings = kwargs.pop('search_settings', {})
        self.current_settings = None
        super().__init__(*args, **kwargs)
        client = get_meilisearch_client()
        self.search_index = client.index(self.cache_key)
        try:
            self.search_index.get_stats()
            self.check_and_update_custom_settings()
        except (MeiliSearchApiError, MeiliSearchCommunicationError) as e:
            if isinstance(e, MeiliSearchApiError):
                client.create_index('documentation')

        self.fields_from_doc = [*self.custom_settings.pop('displayedAttributes'), 'blocks']

    def check_if_settings_changed(self):
        for key, value in self.custom_settings.items():
            current_value = self.current_settings.get(key, not value)
            if isinstance(value, list):
                value = set(value)
                current_value = set(value)
                changes = value.symmetric_difference(current_value)
                if changes:
                    return True
            elif value != current_value:
                return True

    # @ignore_index_not_found
    def check_and_update_custom_settings(self):
        if self.custom_settings:
            try:
                self.current_settings = self.search_index.get_settings()
                if self.check_if_settings_changed():
                    self.search_index.update_settings(self.custom_settings)
                    self.search_index.delete_all_documents()
            except (TypeError, MeiliSearchCommunicationError) as e:
                # get_settings was throwing a weird unsupported operand error only on hard refresh of a kb article page
                logger.info(e)

    # @ignore_index_not_found
    def clear_cache(self):
        super().clear_cache()
        try:
            self.search_index.delete_all_documents()
        except (MeiliSearchCommunicationError, MeiliSearchApiError, TypeError, AttributeError) as e:
        # MeiliSearchApiError is only raised when running with an empty db
            # raised when meilisearch service is unavailable
            logger.warning(e)

    def __setitem__(self, lookup_key, doc):
        """Sets doc to cache using the lookup_key attribute.

        Args:
            doc: Doc to be added to cache
        """
        super().__setitem__(lookup_key, doc)

        if isinstance(doc, list):
            return

        from_doc = {
            key_from_doc: doc.get(key_from_doc)
            for key_from_doc in self.fields_from_doc
        }

        if switch_is_active(SWITCHES.kb_instant_search) and lookup_key.endswith('release'):
            try:
                self.search_index.add_documents(
                    [{
                        **from_doc,
                        'cacheKey': lookup_key,
                        'body': html2plain('\n'.join(block['contentHTML'] for block in doc['blocks']))
                    }],
                    primary_key='cacheKey'
                )
            except (MeiliSearchCommunicationError, TypeError) as e:
                # MeiliSearchCommunicationError is raised when meilisearch service is unavailable
                # TypeError is raised when switch is enabled but no master key provided
                logger.warning(e)

ATTRIBUTES = ['title', 'shortDescription', 'body', 'version', 'id', 'labels', 'kbMenus']

SEARCH_SETTINGS = {
    'displayedAttributes': ATTRIBUTES,
    'searchableAttributes': ATTRIBUTES,
    'sortableAttributes': ATTRIBUTES,
    'filterableAttributes': ['labels', 'kbMenus'],
}
DOC_CACHE = SearchableCache(cache_key='documentation', search_settings=SEARCH_SETTINGS)
BODY_REGEX = re.compile(r'<body>(.*)</body>', re.S)


def inline_styles(body, css):
    if css and body:
        css = '.article-content { ' + css + ' }'
        css = sass.compile(string=css)
        return f'<style>{css}</style>{body}'
    return body


def split_blocks(html):
    blocks = []
    if html:
        soup = BeautifulSoup(html, features="html.parser")
        current_block = {}
        for node in soup.children:
            node_content = node.getText() if type(node) == Tag else str(node)
            node_content = node_content.replace('\n', '')
            node_contentHTML = str(node).replace('\n', '')
            node_class = node.get('class', []) if type(node) == Tag else []
            individual_block = False
            if 'content-block' in node_class:
                node_type = 'content'
                individual_block = True
            elif 'text' in node_class:
                node_type = 'text'
                individual_block = True
            else:
                node_type = 'text'

            if individual_block:
                if current_block and (current_block.get('content') or current_block.get('contentHTML')):
                    blocks.append(current_block.copy())
                    current_block = {}
                blocks.append({
                    "type": node_type,
                    "contentHTML": node_contentHTML,
                    "content": node_content
                })
            elif current_block:
                current_block['content'] += f'{" " if current_block["content"] else ""}{node_content}'
                current_block['contentHTML'] += node_contentHTML
            else:
                current_block = {
                    "type": node_type,
                    "contentHTML": node_contentHTML,
                    "content": node_content
                }
        if current_block and (current_block.get('content') or current_block.get('contentHTML')):
            blocks.append(current_block)
    return blocks


def sub_files(value, datastructures, record_values):
    for ds in datastructures:
        if ds.name in record_values:
            value = value.replace(ds.name, record_values[ds.name])
    return value

def filter_internal_url(link, base = settings.CLOUD_PORTAL_URL):
    url = link.get('href', '').replace('%CLOUD_LINK%', '') or '/'
    if url.startswith('../'):
        url = f"/{url.split('../')[-1]}"
    return url if url.startswith('/') or url.startswith(base) else None

def apply_replacements(html, replacements):
    for replacement in replacements:
        html = html.replace(replacement['original'], replacement['updated'])
    return html

def generate_doc_json(docs, language, draft=False, review=False, trust_cache=False, global_contexts=None, global_contexts_dict=None, external_link = False, force_update = False):
    S3_LINK = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}"
    REPLACEMENT_LINK = '' if external_link else f"{settings.CLOUD_PORTAL_URL}/static/media"
    doc_structures = DataStructure.objects.filter(
        context__asset_type__type=AssetType.ASSET_TYPES.documentation
    )
    doc_file_structures = doc_structures.filter(type=DataStructure.DATA_TYPES.external_file)
    if review:
        state = 'review'
    elif draft:
        state = 'draft'
    else:
        state = 'release'

    docs_json = []

    # Get global contexts and fill any matching variables in datarecords
    cloud_portal = None

    for doc in docs:
        version = None
        doc_id = doc if type(doc) is int else doc.id
        cache_key = f'{settings.CUSTOMIZATION}-{language.code}-{doc_id}-{state}'
        doc_dict = DOC_CACHE[cache_key]

        # Check if we need to query for the asset and version
        if not doc_dict or not trust_cache or review or draft:
            if type(doc) is int:
                doc = Asset.objects.filter(id=doc, asset_type__type=AssetType.ASSET_TYPES.documentation).first()
            if doc:
                version = doc.version_id()
            else:
                continue

        pending_review = None
        if review:
            pending_review = get_review_matching_current_version(doc, version)
            if pending_review:
                version = pending_review.version.id
        elif draft:
            version = None
        elif version == 0:
            # Requested state is published, but no published version exists
            continue

        if force_update or not doc_dict or (external_link or not trust_cache and (doc_dict.get('version', None) != version or draft)):
            if global_contexts_dict is None or global_contexts is None:
                # Get global contexts and fill any matching variables in datarecords
                cloud_portal = get_cloud_portal_asset()
                global_contexts = Context.objects.filter(asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
                global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)

            # Get values of article for this version
            values = DataStructure.find_actual_values(
                doc_structures, asset=doc, language=language, version_id=version, draft=draft or review, customization_name=settings.CUSTOMIZATION
            )
            values = {ds.name: val for ds, val in values.items()}
            doc_dict = dict()
            doc_dict['title'] = values['title']
            doc_dict['shortDescription'] = values['shortDescription']
            internal_link_replacements = get_internal_links(external_link, cloud_portal, doc, doc_dict, values)


            doc_dict['blocks'] = values['body']
            doc_dict['blocks'] = sub_files(doc_dict['blocks'], doc_file_structures, values)
            doc_dict['blocks'] = apply_replacements(doc_dict['blocks'], internal_link_replacements)
            doc_dict['blocks'] = doc_dict['blocks'].replace(S3_LINK, REPLACEMENT_LINK)
            doc_dict['script'] = values['script']
            doc_dict['labels'] = [label.strip() for label in values.get('labels', []) if label.strip()]
            css = values['styling']

            doc_dict['script'] = doc_dict['script'].replace('\r\n', '')

            process_asset_global_contexts(language, cloud_portal, global_contexts, doc.version_id(), doc_dict, global_contexts_dict)

            doc_dict['version'] = version
            doc_dict['blocks'] = split_blocks(inline_styles(doc_dict['blocks'], css))
            doc_dict['id'] = doc.id

            if review and pending_review:
                doc_dict['reviewId'] = pending_review.id

            if not draft:
                doc_dict['kbMenus'] = [node.get_parent().name for node in doc.nodes.all()]
                DOC_CACHE[cache_key] = doc_dict

        doc_dict_copy = doc_dict.copy()
        del doc_dict_copy['version']
        docs_json.append(doc_dict_copy)

    return docs_json


def get_internal_links(external_link, cloud_portal, doc, doc_dict, values):
    from cms.models import ZendeskArticle
    from cms.controllers.special_structures import SpecialStructures

    internal_link_replacements = []

    if not external_link:
        return internal_link_replacements

    doc_dict['external_files'] = [{
                'id': file.id,
                'original_url': str(file),
                'external_file_name': '_'.join(str(file).split('/')[1:])
            } for file in ExternalFile.objects.filter(asset_ds_pair__asset=doc)]
    internal_links = list(filter(lambda url: url is not None, [filter_internal_url(href) for href in BeautifulSoup(values['body'], features="lxml").find_all('a')]))
    for link in internal_links:
        internal_default = {
                        'original': link,
                        'updated': f'{SpecialStructures.calc_cloud_link(cloud_portal)}{link}'
                }
        is_doc = link.startswith('/docs')
        if is_doc:
            menu_url = ''
            slug = ''
            _, _, base_url, *other_segments = link.split('/')
            if other_segments:
                menu_url = other_segments[0]
                if len(other_segments) >= 2:
                    slug = other_segments[1]
            asset_id = int(slug.split('-')[0]) if slug else None
            customization = cloud_portal.customizations.first().name
            articles = [] if not asset_id else ZendeskArticle.objects.filter(
                        site__customization__name=customization, asset_id=asset_id)
            for article in articles:
                menu = article.menu_node.get_parent()
                if menu.base_url == base_url and menu.url == menu_url:
                    internal_link_replacements.append({
                                'original': link,
                                'updated': article.html_url
                            })
                    break
            else:
                internal_link_replacements.append(internal_default)
        else:
            internal_link_replacements.append(internal_default)

    return internal_link_replacements

