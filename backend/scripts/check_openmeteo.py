from datetime import date, timedelta
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.weather import fetch_weather


def main() -> None:
    start_date = date.today()
    forecast = fetch_weather(
        latitude=52.52,
        longitude=13.41,
        start_date=start_date,
        end_date=start_date + timedelta(days=2),
    )
    print(
        "Open-Meteo OK:",
        len(forecast["hourly"]),
        "hourly rows and",
        len(forecast["daily"]),
        "daily rows",
    )


if __name__ == "__main__":
    main()
