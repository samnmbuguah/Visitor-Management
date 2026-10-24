import os
from django.conf import settings
from langchain_openai import ChatOpenAI

def get_chat_llm(
    model: str = None,
    provider: str = None,
    temperature: float = 0.1,
    max_tokens: int = 1000
) -> ChatOpenAI:
    """
    Returns an initialized ChatOpenAI instance configured for OpenRouter or NVIDIA NIM.
    Defaults to OpenRouter with openai/gpt-4o-mini (supports tools and vision).
    """
    provider = provider or getattr(settings, 'AI_MODEL_PROVIDER', 'openrouter')
    
    if provider == 'nvidia':
        api_key = getattr(settings, 'NVIDIA_API_KEY', '') or os.getenv('NVIDIA_API_KEY')
        base_url = 'https://integrate.api.nvidia.com/v1'
        default_model = getattr(settings, 'NVIDIA_DEFAULT_MODEL', 'nvidia/llama-3.1-nemotron-70b-instruct')
    else: # openrouter
        api_key = getattr(settings, 'OPENROUTER_API_KEY', '') or os.getenv('OPENROUTER_API_KEY')
        base_url = 'https://openrouter.ai/api/v1'
        default_model = getattr(settings, 'AI_DEFAULT_MODEL', 'openai/gpt-4o-mini')

    chosen_model = model or default_model

    return ChatOpenAI(
        model=chosen_model,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        default_headers={
            "HTTP-Referer": "https://visitormanagement.local",
            "X-Title": "Visitor Management AI Agent",
        }
    )
