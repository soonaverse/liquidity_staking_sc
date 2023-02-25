**Staking Contract**

The purpose of the contract is to allow people to deposit and lock (stake) a certain LP token for a predetermined duration of time and be rewarded with an amount of wSOON tokens that’s dependent on the length of time the LP tokens are locked and how many other people have staked.

**Steps:**

1. A user provides liquidity for one of the pairs above. I will use wSOON/wBTC in this example. The user then takes the wSOON/wBTC LP tokens they received for providing liquidity and “stake” them in the staking contract.
2. When they go to stake, they have a fill out a couple of prompts:
    1. They need to decide how many of their wSOON/wBTC LP tokens they’d like to stake (they can only stake that specific LP token. Other LP tokens would not work)
    2. They need to decide how long they would like to lock their LP tokens. This can be anywhere from 1 to 52 weeks. While the LP tokens are locked, the users cannot withdraw them from the system.
3. After the user has staked the LP tokens, they will begin receiving the weekly wSOON token rewards until their LP tokens are unlocked.
4. It’s important to note that the wSOON token rewards will need to be locked for 52 weeks after each weekly distribution. Basically these rewards must be vested for 1 year before they can be spent by the user.

**The Multiplier:**

If one user locks their LP tokens for 2 weeks while another user locks theirs for 52 weeks, the user with a longer locking period will receive more wSOON token rewards. This means that each specific time duration has a certain multiplier attached to it. To calculate the multiplier, you follow this formula:

```
Y = MX + B
Y = Multiplier
M = 1 / (52-1)
X = weeks staked/locked
B = 2 - M * 52
```

52 is simply the maximum amount of weeks LP tokens can be staked/locked.

This is to say if a user stakes for 1 week, then they get a multiplier of 1. If a user stakes for 26 weeks, then they get a multiplier of 1.49020. And if a user stakes for the maximum 52 weeks, then they get a multiplier of 2.

**Staked Value:**

The multiplier comes into effect when calculating staked value. The difference between the amount of LP tokens staked and the LP tokens staked value is the multiplier.

For example, if two users stake 10 LP tokens, but one user stakes for 1 week and the other stakes for 52 weeks, the one who staked for 52 weeks will receive double the wSOON reward amount during the weekly distribution.

```
Amount of LP tokens * Multiplier = Staked value
```

The weekly distribution amount in total is fixed and is determined by a 3 year schedule. Here’s a quick view on what that schedule looks like:

| Week 	  | Tokens  	      |
|--------	|---------------- |
|        1| 127,184.415786  |
|        2| 125,963.459629  |
|        3| 124,746.417744  |
|        4| 123,533.329878  |
|        5| 122,324.199901  |
|        6| 121,119.040813  |
|        7| 119,917.865739  |
|        8| 118,720.687939  |
|        9| 117,527.520804  |
|       10| 116,338.377860  |
|       11| 115,153.272773  |
|       12| 113,972.219346  |

If we use the example above, and only those 2 users were staking during the first weekly distribution, the user who only staked for 1 week would receive XXX and the user who staked for 52 weeks would receive XXX. Here are the formulas:

User 1 staked value: 10 * 1 = 10
User 2 staked value: 10 * 2 = 20
Total staked value: 10 + 20 = 30

User 1 proportion of the weekly distribution: 10 / 30 * 127,184.415786 = 42,394.805262
User 2 proportion of the weekly distribution: 20 / 30 * 127,184.415786 = 84,789.610524

# Development
Use following tasks to manage:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
