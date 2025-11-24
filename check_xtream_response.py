import sys
import os
import asyncio
from sqlalchemy import create_engine, text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.xtream import XtreamClient

def get_first_subscription():
    engine = create_engine('sqlite:////db/xtream.db')
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, xtream_url, username, password FROM subscriptions WHERE is_active = 1 LIMIT 1"))
        return result.fetchone()

async def main():
    sub = get_first_subscription()
    if not sub:
        print("No active subscription found")
        return

    print(f"Testing with subscription: {sub.xtream_url}")
    client = XtreamClient(sub.xtream_url, sub.username, sub.password)
    
    try:
        print("\nFetching Movie Categories...")
        movie_cats = await client.get_vod_categories()
        if movie_cats:
            print("First Movie Category Keys:", movie_cats[0].keys())
            print("First Movie Category Sample:", movie_cats[0])
        else:
            print("No movie categories found")

        print("\nFetching Series Categories...")
        series_cats = await client.get_series_categories()
        if series_cats:
            print("First Series Category Keys:", series_cats[0].keys())
            print("First Series Category Sample:", series_cats[0])
        else:
            print("No series categories found")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
