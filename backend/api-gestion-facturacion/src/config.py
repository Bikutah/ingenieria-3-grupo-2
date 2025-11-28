from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    COMANDA_API_BASE_URL: str = "http://gestion-comanda:8000"
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
