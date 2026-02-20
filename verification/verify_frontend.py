from playwright.sync_api import sync_playwright

def test_frontend_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the frontend
            page.goto("http://localhost:3000")

            # Check for the main title
            if page.get_by_role("heading", name="LazyTask Marketplace").is_visible():
                print("Title found.")
            else:
                print("Title NOT found.")

            # Check for "Post a Job" section
            if page.get_by_text("Post a Job").first.is_visible():
                 print("Post a Job section found.")
            else:
                 print("Post a Job section NOT found.")

            # Check for "Available Jobs" section
            if page.get_by_text("Available Jobs").first.is_visible():
                 print("Available Jobs section found.")
            else:
                 print("Available Jobs section NOT found.")

            # Take a screenshot
            page.screenshot(path="verification/frontend_load.png")
            print("Screenshot saved to verification/frontend_load.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    test_frontend_load()
