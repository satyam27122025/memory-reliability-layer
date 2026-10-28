from typing import List, Tuple, Set
from app.models import FactAssertion
from app.services.normalization import normalize_value


def detect_conflict_status(assertions: List[FactAssertion]) -> Tuple[str, Set[str]]:
    """Deterministically analyze assertions for a fact.
    
    Returns:
        (status, set_of_unique_normalized_values)
        where status is 'supported' (if 1 or 0 distinct values) or 'conflict' (if > 1 distinct values).
    """
    if not assertions:
        return "supported", set()

    unique_normalized_values = {normalize_value(a.value) for a in assertions if a.value is not None}

    if len(unique_normalized_values) <= 1:
        return "supported", unique_normalized_values
    else:
        return "conflict", unique_normalized_values

