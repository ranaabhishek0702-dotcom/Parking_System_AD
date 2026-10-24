#!/bin/bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEST="/Users/abhishekrana/.gemini/antigravity-ide/brain/bb033eec-6330-4ae8-a3eb-9a9b5a97ca27"

echo "Capturing Manage Tab..."
"$CHROME" --headless --screenshot="$DEST/admin_manage_tab.png" --window-size=1440,900 "http://localhost:3001/?tab=manage"

echo "Capturing Finance Tab..."
"$CHROME" --headless --screenshot="$DEST/admin_finance_tab.png" --window-size=1440,900 "http://localhost:3001/?tab=finance"

echo "Capturing Enforcement Tab..."
"$CHROME" --headless --screenshot="$DEST/admin_enforcement_tab.png" --window-size=1440,900 "http://localhost:3001/?tab=enforcement"

echo "Capturing Impact Tab..."
"$CHROME" --headless --screenshot="$DEST/admin_impact_tab.png" --window-size=1440,900 "http://localhost:3001/?tab=impact"

echo "Capturing Simulation Tab..."
"$CHROME" --headless --screenshot="$DEST/admin_simulation_tab.png" --window-size=1440,900 "http://localhost:3001/?tab=simulation"

echo "Capturing Copilot Tab..."
"$CHROME" --headless --screenshot="$DEST/admin_copilot_tab.png" --window-size=1440,900 "http://localhost:3001/?tab=copilot"

echo "Capturing Enforcement Role..."
"$CHROME" --headless --screenshot="$DEST/admin_role_enforcement.png" --window-size=1440,900 "http://localhost:3001/?role=enforcement_officer"

echo "All screenshots captured successfully!"
