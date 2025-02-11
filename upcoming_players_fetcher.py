import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re
import pandas as pd

async def get_upcoming_players_page_content():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1920, "height": 1080})

        try:
            # Navigate to the page and wait for network to be idle
            url = "https://www.pgatour.com/tournaments/2025/the-genesis-invitational/R2025007"
            await page.goto(url, wait_until="networkidle")
            await page.wait_for_load_state("domcontentloaded")
            content = await page.content()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            
            # Find all links containing '/player/' pattern
            player_pattern = re.compile(r'/player/\d+/[^/"]+')
            player_links = soup.find_all('a', href=player_pattern)
            
            print("\nFound Players on Main Page:")
            players = {}  # Use dict to store player name and full URL
            for link in player_links:
                href = link.get('href')
                # Ensure full URL
                full_url = f"https://www.pgatour.com{href}" if href.startswith('/') else href
                
                # Extract player name from URL and link text
                link_text = link.get_text().strip()
                if ',' in link_text:
                    # Split name and reformat from "LAST, FIRST" to "FIRST LAST"
                    last_name, first_name = link_text.split(',', 1)
                    player_name = f"{first_name.strip()} {last_name.strip()}"
                else:
                    # If no comma, use as is
                    player_name = link_text
                
                if player_name:  # Only add if we have a name
                    players[player_name] = full_url

            # Convert players dict to DataFrame
            df = pd.DataFrame(list(players.items()), columns=['Player', 'PlayerURL'])
            return df

        except Exception as e:
            print(f"Error: {str(e)}")
            return None

        finally:
            await browser.close()

def get_upcoming_players():
    return asyncio.run(get_upcoming_players_page_content())

if __name__ == "__main__":
    players = get_upcoming_players()
    if not players.empty:
        print("Successfully retrieved players")
    else:
        print("Failed to retrieve players") 