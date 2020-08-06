from django.conf import settings
from django.core.cache import caches
from inlinestyler.utils import inline_css
import re

from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import DataStructure, AssetType, AssetCustomizationReview, Context, get_cloud_portal_asset


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
BLOCKS_REGEX = re.compile(r'(<h1(?:(?!<h1).)*)', re.S)
BLOCK_REGEX = re.compile(r'(<h1.*?>(.*?)</h1>)\n*(.*?)(\n|<br/?>)*$', re.S)
TAG_REGEX = re.compile(r'<.*?>', re.S)


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
        block_search = BLOCKS_REGEX.findall(html)
        for block in block_search:
            block_match = BLOCK_REGEX.match(block)
            block_dict = {
                'titleHTML': block_match.group(1),
                'contentHTML': block_match.group(3) or ''
            }
            block_dict['title'] = TAG_REGEX.sub('', block_dict['titleHTML'])
            block_dict['content'] = TAG_REGEX.sub('', block_dict['contentHTML'])
            blocks.append(block_dict)
    return blocks


def generate_doc_json(docs, language, draft=False, review=False):
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
        version = doc.version_id()
        cache_key = f'{settings.CUSTOMIZATION}-{language.code}-{doc.id}-{state}'
        doc_dict = DOC_CACHE[cache_key]
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

        if not doc_dict or doc_dict.get('version', None) != version or draft:
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
            css = doc_structures.filter(name='styling').first().find_actual_value(
                asset=doc, language=language, version_id=version, draft=draft or review
            )
            process_global_contexts(cloud_portal, doc_dict, doc.version_id(), False,
                                    global_contexts, global_contexts_dict, language=language)
            doc_dict['version'] = version

            doc_dict['blocks'] = split_blocks(inline_styles(doc_dict['blocks'], css))

            if not draft:
                DOC_CACHE[cache_key] = doc_dict

        doc_dict_copy = doc_dict.copy()
        del doc_dict_copy['version']
        docs_json.append(doc_dict_copy)

    return docs_json

