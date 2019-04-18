/**
 * User-curated leaderboard
 *
 * A user can upvote any song with a CID (IPFS-style hashed content ID).  Doing so mints 1 VOTE token
 * and stashes it in a per-song pool.  The user who upvotes can withdraw that token.  If later users
 * upvote after you upvote, you can withdraw bonus tokens.  This bonus is funded by these subsequent
 * upvotes and is based on a kind of exponential decay function that tries to incentivize people
 * to seek out unknown songs and upvote them BEFORE they become very popular.  It's a simple pyramid
 * scheme... early upvoters are rewarded the most.
 *
 * Several notes, problems, and unresolved questions with this implementation:
 *
 * - We talked about not wanting a typical curation market model that requires users to exchange
 *   some existing asset (ETH, for example) for the market's native token at some varying exchange rate
 *   based on a bonding curve.  Why?  Because, given our target market, we're trying to make the web3
 *   layer as invisible as possible.  As a result, we decided to mint VOTE tokens automatically upon
 *   receiving upvotes.  However, this creates a vector for a Sybil attack: any user can create as many
 *   accounts as they want, fund them with microscopic amounts of ETH (to pay for gas), and use those
 *   accounts to mass-upvote a random piece of content in order to mint tokens which they can then lay
 *   claim to.
 *       - Do we instead try to implement Sybil attack prevention on the web2 layer?
 *       - Would this work?: Sybil attack prevention on the web2 layer (IP monitoring, email verification)
 *           for making new accounts.  Every new account automatically gets 1000 VOTE tokens.  Cost
 *           (in VOTE tokens) to upvote is based on a curation market-style exponential curve.
 *
 * - If we have two distinct epochs ­— an upvote period and a withdraw period — calculating the
 *   withdraw amount is easy: we can use a simple curve where rewards are based on your position in
 *   the list of upvoters.  If we allow upvoting and withdrawing simultaneously, things can get more
 *   complex:
 *     - If an early upvoter withdraws, and new users continue to upvote, can they withdraw more
 *       bonus tokens later?  If not, how do we distribute these to the remaining users?
 *
 * - We don't want an implementation where voting or withdrawing requires iterating through all (or
 *   even some) of the votes.  Doing so would seriously limit the number of users able to participate
 *   in the leaderboard due to gas costs.
 *       - I think this implies that we need to be able to calculate withdrawal amounts using a
 *           simple formula based on the number of upvoters, the number of tokens withdrawn, etc. —
 *           simple sums that we can track at O(1) complexity any time an upvote or withdraw happens.
 *           This would mean that we can't allow withdrawal amounts to depend upon the number of users
 *           who've withdrawn ahead of and behind you in the queue.
 *
 * - Do we have any reason to want to disincentivize withdrawing?  For example, should we make it so
 *   that you can only do it once?  Or, rather, is it a purely neutral operation?
 */

import "./UpvoteToken";

contract Chart
{
    UpvoteToken token;
    PayoutCurve payoutCurve;

    constructor(address _token, PayoutCurve _payoutCurve) {
        token = UpvoteToken(_token);
        payoutCurve = _payoutCurve;
    }

    enum PayoutCurve {
        Linear,
    }

    struct Song {
        // Tracks the number of tokenized votes not yet withdrawn from the song.  We use this to calculate withdrawable amounts.
        uint currentUpvotes;
        // Tracks the total number of tokenized votes this song has received.  We use this to rank songs.
        uint allTimeUpvotes;
        // Maps a user's address to their place in the "queue" of users who have upvoted this song.  Used to calculate withdrawable amounts.
        mapping(address => Upvote) upvotes;
    }

    struct Upvote {
        uint index;
        uint withdrawnAmount;
    }

    mapping(bytes32 => Song) songs;

    // ERC-20 stuff
    mapping(address => uint) public balanceOf;

    //
    // Upvote mechanism
    //

    function upvote(bytes32 cid) public {
        Song storage song = songs[cid];

        require(song.upvotes[msg.sender].index == 0, "you have already upvoted this song");

        song.currentUpvotes++;
        song.allTimeUpvotes++;
        song.upvotes[msg.sender].index = song.currentUpvotes;

        token.mint(1 * (10**token.decimals()), address(this));
    }

    function withdraw(bytes32 cid) public {
        Song storage song = songs[cid];

        require(song.upvotes[user].index > 0, "you don't have any tokens stored in this song");
        // require(song.upvotes[user].withdrawn == false, "you've already withdrawn your tokens from this song");

        uint totalWithdrawable = getWithdrawableAmount(msg.sender, cid);
        uint alreadyWithdrawn = song.upvotes[msg.sender].withdrawnAmount;
        uint amountToWithdraw = totalWithdrawable - alreadyWithdrawn;

        assert(song.currentUpvotes >= amountToWithdraw, "calculated withdrawal amount is greater than remaining token supply for this song");

        song.upvotes[user].withdrawnAmount = totalWithdrawable;

        song.currentUpvotes -= amountToWithdraw;
        token.transfer(msg.sender, amountToWithdraw);
    }

    function getWithdrawableAmount(address user, bytes32 cid) public view returns (uint) {
        Song storage song = songs[cid];
        uint i = song.upvotes[user].index;

        if (payoutCurve == PayoutCurve.Linear) {
            // "PayoutCurve.Linear" distributes withdrawable tokens to users according to the area
            // under the curve `f(x) = 1 - x/2t` (where t is the total token supply).  This curve
            // has the property that, for any value of t, the total area under this curve is also t.
            // So to determine the number of tokens owed to user `i` (out of `n` total users), we
            // break the curve up into `n` chunks and allow the user to withdrawn chunk `i`.
            //
            // For simplicity's sake, we'll say that user `i` is always entitled to the area under the
            // curve from `x = i` to `x = i+1`.  This yields a simple integration problem:
            //
            // To calculate the area under f(x) from point `i` to point `i+1`, we first need the
            // indefinite integral of f(x), which is `F(x) = x - (x^2)/4t + C` (note the capital F).
            //
            // We take that anti-derivative and apply the fundamental theorem of calculus:
            //     ∫ f(x)dx from (a->b)    =    F(b) - F(a)
            //
            // Substituting in a = i and b = i+1, we end up with the following formula:
            //     tokens  =  ((i+1) - (i+1)^2/4t)  -  (i - i^2/4t)

            return ((i+1) - ((i+1)**2)/(4 * song.allTimeUpvotes))  -  (i - (i**2)/(4 * song.allTimeUpvotes));

        } else {
            assert(false, "unknown payout curve");
        }
    }

    //
    // Getters
    //

    function getCurrentUpvotes(bytes32 cid) public returns (uint) {
        return songs[cid].currentUpvotes;
    }

    function getAllTimeUpvotes(bytes32 cid) public returns (uint) {
        return songs[cid].allTimeUpvotes;
    }
