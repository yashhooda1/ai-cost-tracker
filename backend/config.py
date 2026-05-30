from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_starter_monthly_price_id: str = ""
    stripe_starter_annual_price_id: str = ""
    stripe_growth_monthly_price_id: str = ""
    stripe_growth_annual_price_id: str = ""
    stripe_enterprise_monthly_price_id: str = ""
    stripe_enterprise_annual_price_id: str = ""
    app_url: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
