from bs4 import BeautifulSoup
from bs4.element import Tag
from django.conf import settings
from django.core.cache import caches
from inlinestyler.utils import inline_css
import re

from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import DataStructure, AssetType, AssetCustomizationReview, Context, get_cloud_portal_asset, Asset


class DocumentationCache:
    def __init__(self):
        self.cache = caches['documentation']

    def __getitem__(self, key):
        return self.cache.get(key, None)

    def __setitem__(self, key, doc):
        self.cache.set(key, doc)

    def clear_cache(self):
        self.cache.clear()


DOC_CACHE = DocumentationCache()
BODY_REGEX = re.compile(r'<body>(.*)</body>', re.S)


def inline_styles(body, css):
    if css and body:
        html = f'<style>{css}</style>{body}'
        html = inline_css(html)
        html = BODY_REGEX.search(html)[1]
        return html
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
            if type(node) == Tag and 'content-block' in node.get('class', []):
                node_type = 'content'
            else:
                node_type = 'text'

            if current_block and node_type != current_block['type']:
                blocks.append(current_block.copy())
                current_block = {}

            if current_block:
                current_block['content'] += f'{" " if current_block["content"] else ""}{node_content}'
                current_block['contentHTML'] += node_contentHTML
            else:
                current_block = {
                    "type": node_type,
                    "contentHTML": node_contentHTML,
                    "content": node_content
                }
        else:
            if current_block:
                blocks.append(current_block)
    return blocks


def generate_doc_json(docs, language, draft=False, review=False, trust_cache=False):
    doc_structures = DataStructure.objects.filter(context__asset_type__type=AssetType.ASSET_TYPES.documentation)
    if review:
        state = 'review'
    elif draft:
        state = 'draft'
    else:
        state = 'release'

    docs_json = []

    # Get global contexts and fill any matching variables in datarecords
    cloud_portal = None
    global_contexts = None
    global_contexts_dict = None

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

        if review:
            pending_review = AssetCustomizationReview.objects.filter(
                version__id__gt=version, version__asset=doc, customization__name=settings.CUSTOMIZATION,
                state=AssetCustomizationReview.REVIEW_STATES.pending).last()
            if pending_review:
                version = pending_review.version.id
            else:
                # Requested state is review, but no review version exists
                continue
        elif draft:
            version = None
        elif version == 0:
            # Requested state is published, but no published version exists
            continue

        if not doc_dict or (not trust_cache and (doc_dict.get('version', None) != version or draft)):
            if global_contexts_dict is None:
                # Get global contexts and fill any matching variables in datarecords
                cloud_portal = get_cloud_portal_asset()
                global_contexts = Context.objects.filter(asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
                global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)

            doc_dict = dict()
            # Get values for title and body of article for this version
            doc_dict['title'] = doc_structures.filter(name='title').first().find_actual_value(
                asset=doc, language=language, version_id=version, draft=draft or review
            )
            doc_dict['tags'] = doc_structures.filter(name='tags').first().find_actual_value(
                asset=doc, language=language, version_id=version, draft=draft or review
            )
            doc_dict['shortDescription'] = doc_structures.filter(name='shortDescription').first().find_actual_value(
                asset=doc, language=language, version_id=version, draft=draft or review
            )
            doc_dict['blocks'] = doc_structures.filter(name='body').first().find_actual_value(
                asset=doc, language=language, version_id=version, draft=draft or review
            )
            doc_dict['script'] = doc_structures.filter(name='script').first().find_actual_value(
                asset=doc, language=language, version_id=version, draft=draft or review
            )
            doc_dict['script'] = doc_dict['script'].replace('\r\n', '')
            css = doc_structures.filter(name='styling').first().find_actual_value(
                asset=doc, language=language, version_id=version, draft=draft or review
            )
            process_global_contexts(cloud_portal, doc_dict, doc.version_id(), False,
                                    global_contexts, global_contexts_dict, language=language)
            doc_dict['version'] = version

            doc_dict['blocks'] = split_blocks(inline_styles(doc_dict['blocks'], css))

            doc_dict['id'] = doc.id

            if not draft:
                DOC_CACHE[cache_key] = doc_dict

        doc_dict_copy = doc_dict.copy()
        del doc_dict_copy['version']
        docs_json.append(doc_dict_copy)

    return docs_json

