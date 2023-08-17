from cms.feature_flags.feature_flags import FLAGS, SWITCHES, SAMPLES
from util.instance_config import CmsConfig


def flags_processor(request):
    return {
        'FLAGS': {key: getattr(FLAGS, key) for key in FLAGS.all_keys},
        'SWITCHES': {key: getattr(SWITCHES, key) for key in SWITCHES.all_keys},
        'SAMPLES': {key: getattr(SAMPLES, key) for key in SAMPLES.all_keys},
        'PRIVATE_1': CmsConfig().is_private_1
    }

