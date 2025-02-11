import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re
import pandas as pd
from functools import lru_cache
from datetime import datetime, timedelta

# Cache storage
_cache = {
    'data': None,
    'timestamp': None
}

# Cache duration (in minutes)
CACHE_DURATION = 3

def should_refresh_cache():
    if _cache['timestamp'] is None or _cache['data'] is None:
        return True
    
    age = datetime.now() - _cache['timestamp']
    return age > timedelta(minutes=CACHE_DURATION)

async def _fetch_upcoming_players():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                '--single-process',
                '--no-zygote'
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 800, 'height': 600},
            java_script_enabled=True,
            bypass_csp=True
        )
        
        try:
            page = await context.new_page()
            url = "https://www.pgatour.com/tournaments/2025/the-genesis-invitational/R2025007"
            await page.goto(url, wait_until="networkidle")
            await page.wait_for_load_state("domcontentloaded")
            content = await page.content()
            
            await page.close()
            await context.close()
            
            soup = BeautifulSoup(content, 'html.parser')
            player_pattern = re.compile(r'/player/\d+/[^/"]+')
            player_links = soup.find_all('a', href=player_pattern)
            
            players_data = []
            for link in player_links:
                href = link.get('href')
                full_url = f"https://www.pgatour.com{href}" if href.startswith('/') else href
                
                link_text = link.get_text().strip()
                if ',' in link_text:
                    last_name, first_name = link_text.split(',', 1)
                    player_name = f"{first_name.strip()} {last_name.strip()}"
                else:
                    player_name = link_text
                
                if player_name:
                    players_data.append({
                        'Player': player_name,
                        'PlayerURL': full_url
                    })
            
            return pd.DataFrame(players_data)

        except Exception as e:
            print(f"Error: {str(e)}")
            return None

        finally:
            if browser:
                await browser.close()

def get_upcoming_players():
    """Get player data from cache or fetch if needed"""
    if should_refresh_cache():
        print("Fetching fresh player data...")
        _cache['data'] = asyncio.run(_fetch_upcoming_players())
        _cache['timestamp'] = datetime.now()
        print(f"Data cached at {_cache['timestamp']}")
    else:
        print(f"Using cached data from {_cache['timestamp']}")
    print(_cache['data'])
    return _cache['data']

if __name__ == "__main__":
    df = get_page_content()
    if df is not None:
        print("\nDataFrame Preview:")
        print(df.head())
        print(f"\nDataFrame Shape: {df.shape}")
    else:
        print("Failed to retrieve players") 