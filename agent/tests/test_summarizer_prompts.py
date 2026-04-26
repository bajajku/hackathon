from agent.summarizer import build_final_prompt, build_rolling_prompt


def test_build_rolling_prompt_contains_windows():
    prompt = build_rolling_prompt(
        room_name='demo-room',
        session_id='sess_123',
        transcripts=[
            {'speaker': 'Alice', 'text': 'We should ship by Friday.'},
            {'speaker': 'Bob', 'text': 'Need QA sign-off first.'},
        ],
        vision_events=[
            {'ocrText': 'Roadmap Q2', 'labels': ['text', 'diagram'], 'error': None},
        ],
    )

    assert 'demo-room' in prompt
    assert 'sess_123' in prompt
    assert 'Alice' in prompt
    assert 'Roadmap Q2' in prompt


def test_build_final_prompt_includes_transcript_and_vision():
    prompt = build_final_prompt(
        room_name='demo-room',
        session_id='sess_456',
        transcript_text='[Alice] Hello world',
        vision_text='OCR: Quarterly plan',
    )

    assert 'final meeting summary' in prompt.lower()
    assert 'Hello world' in prompt
    assert 'Quarterly plan' in prompt
