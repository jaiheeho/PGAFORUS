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
CACHE_DURATION = 120

def should_refresh_cache():
    return True
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
            
            # Navigate to page and wait for content
            url = "https://www.pgatour.com/tournaments/2025/the-genesis-invitational/R2025007"
            
            # Wait for specific elements to be loaded
            await page.goto(url, wait_until="networkidle")
            await page.wait_for_load_state("domcontentloaded")
            
            table_element = await page.query_selector("table")
            if table_element:
                inner_html = await table_element.inner_html()
            else:
                print("Error: Table element not found")

            await page.close()
            await context.close()

            tr_regex = r'<tr[^>]*class="player-[^"]*"[^>]*>.*?</tr>'
            tr_matches = re.findall(tr_regex, inner_html, re.DOTALL)


            players_data = []
            for tr_html in tr_matches:
                soup = BeautifulSoup(tr_html, "html.parser")
                player_links = soup.find_all('a', href=re.compile(r'/player/\d+/([^/]+)'))
                
                for link in player_links:
                    href = link.get('href')
                    match = re.search(r'/player/\d+/([^/]+)', href)
                    if match:
                        player_slug = match.group(1)
                        player_name = player_slug.replace('-', ' ').title()
                        print(f"Found player: {player_name} (URL: {href})")
                        players_data.append({
                            'Player': player_name,
                            'PlayerURL': f"https://www.pgatour.com{href}"
                        })
            
            return pd.DataFrame(players_data)
            
        except Exception as e:
            print(f"Error: {str(e)}")
            return pd.DataFrame(columns=['Player', 'PlayerURL'])
            
        finally:
            if 'page' in locals():
                await page.close()
            if 'context' in locals():
                await context.close()
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
    df = get_upcoming_players()
    if df is not None:
        print("\nDataFrame Preview:")
        print(df.head())
        print(f"\nDataFrame Shape: {df.shape}")
    else:
        print("Failed to retrieve players") 