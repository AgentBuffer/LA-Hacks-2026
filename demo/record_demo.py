"""
MediaFlow — LA Hacks 2026 Demo Recording Script

Automates a 2-minute screen recording walkthrough of the MediaFlow product.
Connects to the already-running Chrome browser via CDP and performs all
interactions with precise timing for a polished hackathon demo video.
"""

import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
SLOW = 80  # ms per keystroke for visible typing


async def smooth_scroll(page, amount: int, steps: int = 10, delay: float = 0.08):
    """Scroll smoothly by `amount` pixels over `steps` increments."""
    per = amount // steps
    for _ in range(steps):
        await page.evaluate(f"window.scrollBy(0, {per})")
        await asyncio.sleep(delay)


async def slow_type(page, selector: str, text: str, delay_ms: int = SLOW):
    """Type text character by character with visible delay."""
    await page.click(selector)
    await asyncio.sleep(0.3)
    for ch in text:
        await page.keyboard.type(ch, delay=delay_ms)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:29229")
        context = browser.contexts[0]
        page = context.pages[0]
        await page.set_viewport_size({"width": 1920, "height": 1080})

        # ── SCENE 1: Landing Page (~25s) ──────────────────────────
        await page.goto(BASE, wait_until="networkidle")
        await asyncio.sleep(4)  # pause on hero

        await smooth_scroll(page, 600, steps=12, delay=0.12)  # to Product Peek
        await asyncio.sleep(3)

        await smooth_scroll(page, 700, steps=14, delay=0.12)  # to How It Works
        await asyncio.sleep(3)

        await smooth_scroll(page, 700, steps=14, delay=0.12)  # to Meet The Agents
        await asyncio.sleep(3)

        await smooth_scroll(page, 700, steps=14, delay=0.12)  # to Critic In Action
        await asyncio.sleep(4)  # key differentiator

        await smooth_scroll(page, 700, steps=14, delay=0.12)  # to Built With
        await asyncio.sleep(3)

        # ── SCENE 2: Sign Up & Onboarding (~20s) ─────────────────
        await page.goto(f"{BASE}/signup", wait_until="networkidle")
        await asyncio.sleep(2)

        await slow_type(page, 'input[type="text"]', "Lumen Coffee")
        await asyncio.sleep(0.5)

        await slow_type(page, 'input[type="email"]', "demo@mediaflow.ai")
        await asyncio.sleep(0.5)

        await slow_type(page, 'input[type="password"]', "DemoPass123!")
        await asyncio.sleep(2)

        # Navigate to onboarding (auth not functional in demo mode)
        await page.goto(f"{BASE}/dashboard/onboard", wait_until="networkidle")
        await asyncio.sleep(3)

        # Hover "Use demo brand" button
        demo_btn = page.locator("text=Use demo brand")
        if await demo_btn.count() > 0:
            await demo_btn.hover()
            await asyncio.sleep(2)

        # Scroll down to show brand basics form
        await smooth_scroll(page, 300, steps=6, delay=0.1)
        await asyncio.sleep(2)

        # ── SCENE 3: Agents Dashboard (~25s) ─────────────────────
        await page.goto(f"{BASE}/dashboard/agents", wait_until="networkidle")
        await asyncio.sleep(4)

        # Hover over the first "run now" button
        run_btn = page.locator("text=run now").first
        if await run_btn.count() > 0:
            await run_btn.hover()
            await asyncio.sleep(3)

        # Move to the second agent card area
        second_card = page.locator("text=Behind the Beans")
        if await second_card.count() > 0:
            await second_card.hover()
            await asyncio.sleep(3)

        # Move to the third card
        third_card = page.locator("text=Weekend Vibes")
        if await third_card.count() > 0:
            await third_card.hover()
            await asyncio.sleep(3)

        # Hover over the HireChatPanel area
        hire_area = page.locator("text=Describe a recurring agent")
        if await hire_area.count() > 0:
            await hire_area.hover()
            await asyncio.sleep(3)

        # ── SCENE 4: Create / Hire Agent (~25s) ──────────────────
        await page.goto(f"{BASE}/dashboard/create", wait_until="networkidle")
        await asyncio.sleep(3)

        # Type the agent description
        textarea = page.locator("textarea")
        await textarea.click()
        await asyncio.sleep(0.5)
        prompt = "Create a daily LinkedIn agent that shares morning coffee tips with a warm, friendly voice"
        for ch in prompt:
            await page.keyboard.type(ch, delay=35)
        await asyncio.sleep(4)

        # Type follow-up
        await textarea.fill("")
        await asyncio.sleep(0.3)
        follow_up = "Make it post at 8am and add the image_creator tool"
        for ch in follow_up:
            await page.keyboard.type(ch, delay=35)
        await asyncio.sleep(4)

        # ── SCENE 5: Calendar View (~20s) ────────────────────────
        await page.goto(f"{BASE}/dashboard/calendar", wait_until="networkidle")
        await asyncio.sleep(4)

        # Navigate to next week
        next_btn = page.locator('button[aria-label="Next week"]')
        if await next_btn.count() > 0:
            await next_btn.click()
            await asyncio.sleep(2)

        # Go back
        prev_btn = page.locator('button[aria-label="Previous week"]')
        if await prev_btn.count() > 0:
            await prev_btn.click()
            await asyncio.sleep(2)

        # Click a post card to open the modal
        first_card = page.locator("text=Every morning deserves")
        if await first_card.count() > 0:
            await first_card.click()
            await asyncio.sleep(3)

        # Close modal
        close_btn = page.locator('button[aria-label="Close"]')
        if await close_btn.count() > 0:
            await close_btn.click()
            await asyncio.sleep(2)

        # ── SCENE 6: Live Stream (~15s) ──────────────────────────
        await page.goto(f"{BASE}/dashboard/live", wait_until="networkidle")
        await asyncio.sleep(5)

        # Slowly scroll through the event log
        await smooth_scroll(page, 300, steps=8, delay=0.15)
        await asyncio.sleep(4)

        await smooth_scroll(page, -200, steps=6, delay=0.15)
        await asyncio.sleep(3)

        # ── ENDING (~5s) ─────────────────────────────────────────
        await page.goto(BASE, wait_until="networkidle")
        await asyncio.sleep(5)

        await browser.close()
        print("Demo walkthrough complete.")


if __name__ == "__main__":
    asyncio.run(main())
