import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re
import pandas as pd
from functools import lru_cache
from datetime import datetime, timedelta
import logging
import traceback

# Cache storage
_cache = {
    'data': None,
    'timestamp': None
}

# Cache duration (in minutes)
CACHE_DURATION = 120

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('upcoming_players_fetcher')

def should_refresh_cache():
    if _cache['timestamp'] is None or _cache['data'] is None:
        return True
    
    age = datetime.now() - _cache['timestamp']
    return age > timedelta(minutes=CACHE_DURATION)

async def _fetch_upcoming_players():
    logger.info("Starting _fetch_upcoming_players")
    async with async_playwright() as p:
        browser = None
        context = None
        page = None
        try:
            logger.debug("Launching browser")
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    '--single-process',
                    '--no-zygote',
                    # Memory optimization flags
                    '--js-flags=--max-old-space-size=512',  # Limit V8 memory
                    '--disable-extensions',  # Disable extensions to save memory
                    '--disable-component-extensions-with-background-pages',
                    '--disable-default-apps',
                    '--mute-audio',  # Disable audio to save memory
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-breakpad',  # Disable crash reporting
                    '--disable-client-side-phishing-detection',
                    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                    '--disable-ipc-flooding-protection',
                    '--disable-prompt-on-repost',
                    '--disable-renderer-backgrounding',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--no-first-run'
                ]
            )
            
            logger.debug("Creating browser context")
            context = await browser.new_context(
                viewport={'width': 800, 'height': 600},
                java_script_enabled=True,
                bypass_csp=True
            )
            
            logger.debug("Creating new page")
            page = await context.new_page()
            
            url = "https://www.pgatour.com/tournaments/2025/the-genesis-invitational/R2025007"
            logger.info(f"Navigating to URL: {url}")
            
            # Set a reasonable timeout
            page.set_default_timeout(30000)  # 30 seconds max

            try:
                # Use a more specific wait condition
                await page.goto(url, wait_until="domcontentloaded")
                logger.debug("Initial page load complete")

                # Wait specifically for the table element we need
                logger.debug("Waiting for table element")
                await page.wait_for_selector("table", timeout=10000)
                logger.debug("Table element found")

            except Exception as e:
                logger.error(f"Page load error: {str(e)}")
                logger.error(f"Current URL: {page.url}")
                logger.error(f"Page content length: {len(await page.content())}")
                raise
            
            logger.debug("Looking for table element")
            table_element = await page.query_selector("table")
            if table_element:
                inner_html = await table_element.inner_html()
                logger.debug(f"Table HTML length: {len(inner_html)}")
            else:
                logger.error("Table element not found on page")
                return pd.DataFrame(columns=['Player', 'PlayerURL'])

            tr_regex = r'<tr[^>]*class="player-[^"]*"[^>]*>.*?</tr>'
            tr_matches = re.findall(tr_regex, inner_html, re.DOTALL)
            logger.info(f"Found {len(tr_matches)} player rows")

            players_data = []
            for idx, tr_html in enumerate(tr_matches):
                try:
                    soup = BeautifulSoup(tr_html, "html.parser")
                    player_links = soup.find_all('a', href=re.compile(r'/player/\d+/([^/?]+)'))
                    
                    for link in player_links:
                        href = link.get('href')
                        # Match player URL but exclude query parameters
                        match = re.search(r'/player/\d+/([^/?]+)', href)
                        if match:
                            player_slug = match.group(1)
                            player_name = player_slug.replace('-', ' ').title()
                            logger.debug(f"Found player: {player_name}")
                            players_data.append({
                                'Player': player_name,
                                'PlayerURL': f"https://www.pgatour.com/{match.group().lstrip('/')}"
                            })
                except Exception as e:
                    logger.error(f"Error processing player row {idx}: {str(e)}")
                    logger.error(f"Row HTML: {tr_html}")
            
            logger.info(f"Successfully processed {len(players_data)} players")
            return pd.DataFrame(players_data)
            
        except Exception as e:
            logger.error(f"Error in _fetch_upcoming_players: {str(e)}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            return pd.DataFrame(columns=['Player', 'PlayerURL'])
            
        finally:
            logger.debug("Cleaning up browser resources")
            if page:
                await page.close()
            if context:
                await context.close()
            if browser:
                await browser.close()

def get_upcoming_players():
    """Get player data from cache or fetch if needed"""
    logger.info("Starting get_upcoming_players")
    try:
        if should_refresh_cache():
            logger.info("Cache refresh needed, fetching fresh data")
            _cache['data'] = asyncio.run(_fetch_upcoming_players())
            _cache['timestamp'] = datetime.now()
            logger.info(f"Data cached at {_cache['timestamp']}")
        else:
            logger.info(f"Using cached data from {_cache['timestamp']}")
        
        if _cache['data'] is None:
            logger.error("Cache data is None")
            return pd.DataFrame(columns=['Player', 'PlayerURL'])
            
        logger.debug(f"Returning DataFrame with shape: {_cache['data'].shape}")
        return _cache['data']
    except Exception as e:
        logger.error(f"Error in get_upcoming_players: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return pd.DataFrame(columns=['Player', 'PlayerURL'])

if __name__ == "__main__":
    try:
        df = get_upcoming_players()
        logger.info(f"Main: Retrieved DataFrame with shape: {df.shape}")
        print("\nDataFrame Preview:")
        print(df.head())
        print(f"\nDataFrame Shape: {df.shape}")
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        print("Failed to retrieve players") 