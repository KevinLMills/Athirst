# Athirst
A browser game made for charity:water.

[Athirst] - Game Logic: 

1. Game Start:
   - The gameplay starts with a small population of people, all of whom are assigned to collecting water.
   - The screen will boast 4 counters at the top of the screen. There are two big ones, which indicate the current population size and the change in water supply. The other two smaller counters indicate research gain and production gain.
 - At the bottom of the screen is an “End Turn” button and turn number indicator
- At the beginning of the game there is only 1 occupation site, that being the water collection. More will appear as the population grows. Each of the occupation sites have a UI element above them with a plus, minus, and worker counter. If an occupation site is locked, it will be greyed out and the UI element will simply display “Available at Population X” where X is the population number required.

2. Player Actions:
   - The End Turn button (ETB) is the most important button to the game loop. Every occupation site has a number of workers assigned to it. Each time the ETB is pressed, each of the counters at the top of screen will change. Each occupation site adds to one or more of the counters and subtracts an amount from the water pool proportional to the number of workers.
- Each open occupation site has a plus or minus above it to add or remove workers from the site. Unassigned workers are placed at water collection, and if there are no workers on water collection then no more workers can be added to a site.

3. Game Logic:
   - Whenever there is 5 extra water after all people are hydrated, the population will increase. It will increase proportional to the amount of excess water. If the player runs out of water (the water counter displays as negative) then the population will begin to subtract.
   - When the population reaches a certain amount, new occupation sites will become available. The early occupation sites all take 1 water and produce a small amount of water, research, or production to start.
- The research and production counters work up two separate linear progression paths that provide certain rewards. These rewards will do a wide range of things, from increasing the efficiency of workers in certain job sites to reducing the water cost to increasing the max population.
- One of the latter production nodes is the water spout, which sets the water count to infinite, allowing there to be zero workers set to water collection. This sets the population growth to a percentage growth relative to the current population.

4. Score/Feedback:
   - The 4 counters at the top of the screen indicate how the player is progressing. The population counter is the only to represent the total population count, though every counter represents the change to the total when the End Turn button is pressed. That means that each of the change in values will change as workers are reassigned during a turn.
   - What visual or audio feedback appears based on player actions?

5. Win or Lose Conditions:
   - The game is won when the water spout is built, though this does not end the game. The game is built around the idea of human working time being the main resource and how collecting water takes so much of that time. Then once the water spout is built, then so much of that labor time can be devoted to other things. The only way that the game forces and end is if the player loses.
   - The player loses if their population reaches 0.
  - Wining and losing makes a pop-up appear with some flavor text. 

6. Reset/Replay:
   - Upon reset, the game reverts all the way back to the start of progression.

**Branding:**
The charity:water logo is presented in full at the menu/ startup screen. The yellow (#FFC700) is present in the entirety of the game’s UI, as is most of the color scheme. The 3rd turn of the game will emphasize the importance of placing people on the water collecting occupation. The game lose screen will also touch on the bottleneck that water collection places on a town. When the Water spout is created, there will be a short briefing on the way that this will change the town and how charity:water is working to do this in the real world. A link to charity:water will be presented at this screen, and the charity:water logo at the start screen will be a clickable link. 
