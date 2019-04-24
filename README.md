# contracts-curation

Smart contracts for curation markets, charts, etc.


# Incentive design considerations

## I. Are tokens tradable?

**Yes:**
- There will be at least two "meanings" of the token: **reputation** and **financial value**
- People will be able to buy reputation
- People will be able to buy the right to upvote (and thus game the leaderboard)
- Sybil attack protection will break down against users with lots of money
- We might draw in more users — specifically, users who are interested in curation as a means of accumulating financial value (but who otherwise think it's a waste of time).

**No:**
- Tokens will exclusively signify your reputation as a curator
- The only incentives to accumulate more tokens will be
    - ...to demonstrate that you are a skilled curator, and
    - ...to make it possible to continue curating (because curating costs a token).

## II. Token supply

**Mint a token when a user upvotes:**
- This will require building in some kind of Sybil attack protection
- Inflation erodes the value of the token over time, meaning it's better-suited to a token representing something like reputation

**Fixed supply:**
- Gives us at least *some* built-in Sybil attack protection (although not against wealthy users)
- Holds the value of the token constant over time
- How do users obtain tokens?
    1. On an open market/exchange: requires real money, discourages adoption
    2. Granted on account creation: good UX + promotes adoption, but what happens when we "run out"?  Can we ask/force users to contribute back to a "new user pool"? (The incentive would be to keep growing the user base and, by extension, the relevance of the leaderboard)


## III. Payout curve

**Linear:**
- Variations on `y = 1 - x`
- Doesn't really do much to incentivize early upvoters, as your withdrawable amount doesn't really increase much as other users upvote after you.

**Reciprocal:**
- Variations on `y = 1/x`
- Weights the payout for early upvoters much more than that for later upvoters.


## IV. Withdrawals

**No-effect:**
- Withdrawals can happen as many times as the user wants
- 

**Only withdraw once:**
- Disincentivizes withdrawing
- 




