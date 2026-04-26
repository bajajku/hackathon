from .config import load_settings


def main() -> None:
    import uvicorn

    settings = load_settings()
    uvicorn.run('agent.main:app', host=settings.host, port=settings.port, reload=False)


if __name__ == '__main__':
    main()
