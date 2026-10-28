def normalize_text(text: str) -> str:
    """Normalize entity or attribute name for deterministic matching.
    
    Trims surrounding whitespace and converts to lowercase.
    """
    if not text:
        return ""
    return text.strip().lower()


def normalize_value(value: str) -> str:
    """Normalize asserted fact values for deterministic conflict detection.
    
    Trims surrounding whitespace and converts to lowercase so that
    e.g. 'Paid', ' paid ', and 'PAID' are recognized as identical logical assertions.
    """
    if not value:
        return ""
    return value.strip().lower()

