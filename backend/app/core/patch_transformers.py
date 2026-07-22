import logging

logger = logging.getLogger(__name__)

def patch_transformers():
    """
    Applies startup monkeypatching to transformers classes.
    Resolves the Florence-2 loading crash: 'Florence2LanguageConfig' object has no attribute 'forced_bos_token_id'.
    """
    try:
        import transformers
        # Patch PretrainedConfig to have forced_bos_token_id as class attribute
        if not hasattr(transformers.PretrainedConfig, "forced_bos_token_id"):
            logger.info("Monkeypatching PretrainedConfig.forced_bos_token_id = None for transformers v5 compatibility.")
            transformers.PretrainedConfig.forced_bos_token_id = None
            
        # Patch PreTrainedTokenizer and PreTrainedTokenizerFast to have additional_special_tokens
        if not hasattr(transformers.PreTrainedTokenizer, "additional_special_tokens"):
            logger.info("Monkeypatching PreTrainedTokenizer.additional_special_tokens = [] for transformers v5 compatibility.")
            transformers.PreTrainedTokenizer.additional_special_tokens = []
        if not hasattr(transformers.PreTrainedTokenizerFast, "additional_special_tokens"):
            logger.info("Monkeypatching PreTrainedTokenizerFast.additional_special_tokens = [] for transformers v5 compatibility.")
            transformers.PreTrainedTokenizerFast.additional_special_tokens = []
    except Exception as e:
        logger.error(f"Failed to apply transformers monkeypatch: {e}")
