from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./canteen.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    payment_timeout_seconds: int = 600  # 10 minutes
    timezone: str = "Asia/Kolkata"
    cookie_name: str = "access_token"
    
    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"
    allowed_domain: str = "iitism.ac.in"

    class Config:
        env_file = ".env"


settings = Settings()
