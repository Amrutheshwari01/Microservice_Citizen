from app.core.identifiers import (
    PUBLIC_CITIZEN_ID_PATTERN,
    generate_public_citizen_id,
)


def test_generated_public_citizen_ids_match_format_and_are_unique():
    citizen_ids = {generate_public_citizen_id() for _ in range(500)}

    assert len(citizen_ids) == 500
    assert all(
        PUBLIC_CITIZEN_ID_PATTERN.fullmatch(citizen_id) for citizen_id in citizen_ids
    )


def test_public_citizen_id_pattern_rejects_malformed_values():
    assert not PUBLIC_CITIZEN_ID_PATTERN.fullmatch("AGL-CIT-123")
    assert not PUBLIC_CITIZEN_ID_PATTERN.fullmatch("AGL-CIT-00000000000000000000000I")
    assert not PUBLIC_CITIZEN_ID_PATTERN.fullmatch(" AGL-CIT-0123456789ABCDEF012345")
