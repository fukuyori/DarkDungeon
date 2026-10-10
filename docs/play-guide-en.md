# Playing DarkDungeon

## Start an adventure

Choose English in the launcher and click Play. Select a name, role, race, gender and alignment, or use Random. Available combinations and starting equipment depend on the role.

The adventure explores NetHack's dungeon. Characters, enemies and items use NetHack's tiles, and their abilities follow NetHack's rules.

Equipment and status appear at the top, the dungeon in the center, and messages at the bottom. The message pane is opaque and spans the window width. Toolbars sit directly below it and switch between one and two rows as the window width changes.

## Movement and time

Characters and items are drawn with transparent backgrounds over terrain, leaving the floor or staircase beneath them visible. Walls use thick, dark gray stone masonry and floors use lighter gray flagstones. Floor brightness distinguishes lit rooms, dark rooms and corridors. Realtime practice uses the same stonework.

Use the arrow keys to move. Moving into an enemy attacks it. Walls and closed doors block movement. The in-game help describes diagonal movement and other key bindings.

The adventure uses turns: taking an action lets enemies act. Reading a menu and using realtime practice do not advance the adventure. Use Action for searching, opening doors, picking up items, eating and resting. Use Up or Down while standing on a staircase to change levels.

Space chooses a basic action in this order: look inside a container at your feet, pick up floor items, use the staircase beneath you, then open an adjacent closed door. Multiple containers or items open a selection menu; multiple closed doors ask for a direction. With no target, Space waits one turn and enemies act. Normal locks, traps and restrictions still apply. Holding Space does not repeat adventure actions. Text input and selection screens keep their usual Space behavior. Space draws your sword in realtime practice.

## Status and inventory

The toolbar shows each action name below a 24-pixel icon. A bow fires ammunition, bread means Eat, a magnifying glass means Search, and an hourglass means Rest. Zoom in and Zoom out adjust the dungeon tiles, which start at 48 pixels. Resizing the window recenters the map on your character. Drag the divider between the upper panels and dungeon to adjust their space.

The toolbar automatically uses one row when all buttons fit, and two rows in a narrower window. Basic action (the same action as Space) and common actions come first, followed by Inventory, Wield weapon, Use tool, Contents (look inside a container at your feet), Open door, Close door, Up, Down, and zoom. The status panel expands with the window alongside the message log. Commands keep the usual item and direction prompts; cancel a prompt before choosing another toolbar action. Contents follows normal lock and trap checks.

The status panel shows hit points, power, armor class, level, gold, turns and alignment. Losing all hit points ends the adventure. A lower armor class usually provides better protection. Watch hunger and conditions such as confusion, blindness and petrification.

Info provides your inventory, attributes, discoveries, skills and dungeon overview. Inventory letters select individual items. Unidentified items may show their appearance rather than their true name. Blessings, curses and other properties affect items; appearance alone does not establish safety.

Gear provides wielding, armor and accessories. Use tools through Apply under Action; use potions, scrolls, wands and spells under Magic. Answer subsequent prompts to select an item or direction.

## Enemies, pets and exploration

Combat, projectiles, traps, hunger and dangerous items affect health and conditions. Pets and peaceful creatures also inhabit the dungeon: read confirmation questions before attacking. Shops require payment. Use the information commands to examine unfamiliar symbols and creatures.

NetHack's usual objective is to recover the Amulet of Yendor and offer it to your deity. Special levels and role quests have their own conditions. Detailed rules combining turn-based and realtime play remain under consideration.

## Realtime practice

Choose Practice → Realtime practice to try controls on the current level's terrain.

| Action | Key |
|---|---|
| Move | Arrows / WASD |
| Draw your sword | Hold Space |
| Pause or resume | P |
| Reset practice | R |
| Return to the adventure | Esc |

Try sword timing and direction, shields, enemies and projectiles. The hero and enemies are drawn with NetHack tiles, and a line shows your drawn sword. Losing window focus pauses practice; press P to resume. Position, health and defeated enemies in practice do not change the adventure. Closing practice discards its state. Its map includes unexplored terrain.

## Save, exit and language

Choose Game → Save-and-exit to save. Select the saved character on your next launch to resume. Quit-without-saving does not save the adventure.

Choose a language in the launcher. The in-game Language menu sets the next launch's preference; save and exit your current adventure first. English and Japanese adventures are saved separately. Changing language does not translate an existing adventure.

## Help and settings

Help and Info provide command and item explanations. Menu search matches the displayed text. Game → Options changes adventure options; Qt settings adjusts fonts, tiles and inventory display. Option names and extended-command identifiers use English.

This guide describes DarkDungeon's current controls. The original NetHack guidebook is also included as reference material.
