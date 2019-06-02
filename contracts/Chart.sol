pragma solidity 0.5.8;

import "./RealMath.sol";

contract Chart is RealMath
{
    uint public constant DECIMALS = 6;
    PayoutCurve public payoutCurve;
    uint public proposalCost;
    uint public upvoteCost = 1 * (10 ** DECIMALS);

    constructor(PayoutCurve _payoutCurve, uint _proposalCost) public {
        payoutCurve = _payoutCurve;
        proposalCost = _proposalCost * (10 ** DECIMALS);
    }

    enum PayoutCurve {
        Linear,
        Reciprocal
    }

    struct Song {
        // Tracks the block when the song was initially submitted (to facilitate calculating a score that decays over time)
        uint submittedInBlock;
        // Tracks the number of tokenized votes not yet withdrawn from the song.  We use this to calculate withdrawable amounts.
        uint currentUpvotes;
        // Tracks the total number of tokenized votes this song has received.  We use this to rank songs.
        uint allTimeUpvotes;
        // Tracks the number of upvoters (!= allTimeUpvotes when upvoteCost != 1)
        uint numUpvoters;
        // Maps a user's address to their place in the "queue" of users who have upvoted this song.  Used to calculate withdrawable amounts.
        mapping(address => Upvote) upvotes;
    }

    struct Upvote {
        uint index; // 1-based index
        uint withdrawnAmount;
    }

    mapping(bytes32 => Song) public songs;
    mapping(address => uint) public balanceOf; // token balances

    // This mapping tracks which addresses we've seen before.  If an address has never been seen, and
    // its balance is 0, then it receives a token grant the first time it proposes or upvotes a song.
    // This helps us prevent users from re-upping on tokens every time they hit a 0 balance.
    mapping(address => bool) public receivedTokenGrant;
    uint public tokenGrantSize = 100 * (10 ** DECIMALS);

    //
    // Events
    //

    event SongProposed(address indexed proposer, bytes32 cid);
    event SongUpvoted(address indexed upvoter, bytes32 cid);

    //
    // Upvote mechanism
    //

    modifier maybeTokenGrant {
        if (receivedTokenGrant[msg.sender] == false) {
            receivedTokenGrant[msg.sender] = true;
            balanceOf[msg.sender] += tokenGrantSize;
        }
        _;
    }

    function propose(bytes32 cid) maybeTokenGrant public {
        require(songs[cid].numUpvoters == 0, "already proposed");
        require(balanceOf[msg.sender] >= proposalCost, "not enough tokens to propose");

        Song storage song = songs[cid];
        song.submittedInBlock = block.number;

        balanceOf[msg.sender] -= proposalCost;
        song.currentUpvotes += proposalCost;
        song.allTimeUpvotes += proposalCost;
        song.numUpvoters++;
        song.upvotes[msg.sender].index = song.numUpvoters;

        emit SongProposed(msg.sender, cid);
    }

    function upvote(bytes32 cid) maybeTokenGrant public {
        require(balanceOf[msg.sender] >= upvoteCost, "not enough tokens to upvote");
        balanceOf[msg.sender] -= upvoteCost;

        Song storage song = songs[cid];
        require(song.upvotes[msg.sender].index == 0, "you have already upvoted this song");

        song.currentUpvotes += upvoteCost;
        song.allTimeUpvotes += upvoteCost;
        song.numUpvoters++;
        song.upvotes[msg.sender].index = song.numUpvoters;

        emit SongUpvoted(msg.sender, cid);
    }

    function withdraw(bytes32[] memory cids) public {
        for (uint i = 0; i < cids.length; i++) {
            bytes32 cid = cids[i];

            Song storage song = songs[cid];

            require(song.upvotes[msg.sender].index > 0, "you don't have any tokens stored in this song");

            uint totalWithdrawable = getWithdrawableAmount(msg.sender, cid);
            uint alreadyWithdrawn = song.upvotes[msg.sender].withdrawnAmount;
            uint amountToWithdraw = totalWithdrawable - alreadyWithdrawn;

            require(song.currentUpvotes >= amountToWithdraw, "calculated withdrawal amount is greater than remaining token supply for this song");

            song.upvotes[msg.sender].withdrawnAmount = totalWithdrawable;

            song.currentUpvotes -= amountToWithdraw;
            balanceOf[msg.sender] += amountToWithdraw;
        }
    }

    //
    // Getters
    //

    function getWithdrawableAmount(address user, bytes32 cid) public view returns (uint) {
        Song storage song = songs[cid];

        if (song.upvotes[user].index == 0) {
            return 0;
        }

        if (payoutCurve == PayoutCurve.Linear) {
            uint i = song.upvotes[user].index - 1;
            uint t = song.allTimeUpvotes;
            return (((uint(-2) * i) - 1) / t) + 2;

        } else if (payoutCurve == PayoutCurve.Reciprocal) {
            uint i = song.upvotes[user].index - 1;
            int128 t = div(toReal(int88(song.allTimeUpvotes)), toReal(int88(10**DECIMALS)));
            int128 t_2 = ipow(t, 2);

            int128 a = ln(toReal(int88((i+2)**2)));
            int128 b = ln(toReal(int88((i+1)**2)));
            int128 c = ln(toReal(1) + t);

            int128 numerator   = mul(t_2, a) - mul(t_2, b) + mul(t, a) - mul(t, b) - mul(toReal(2), t);
            int128 denominator = mul(toReal(2), c + mul(t, toReal(-1)+c));
            int128 amount = div(numerator, denominator);
            amount = mul(amount, toReal(int88(10**DECIMALS)));
            return uint(fromReal(amount));

        } else {
            revert("unknown payout curve");
        }
    }

    function getCurrentUpvotes(bytes32 cid) public view returns (uint) {
        return songs[cid].currentUpvotes;
    }

    function getAllTimeUpvotes(bytes32 cid) public view returns (uint) {
        return songs[cid].allTimeUpvotes;
    }

    function getNumUpvoters(bytes32 cid) public view returns (uint) {
        return songs[cid].numUpvoters;
    }

    function getUpvoteIndex(bytes32 cid, address user) public view returns (uint) {
        return songs[cid].upvotes[user].index;
    }

    function getSongScore(bytes32 cid) public view returns (uint) {
        Song storage song = songs[cid];
        require(song.numUpvoters > 0, "song doesn't exist");

        uint delta = block.number - song.submittedInBlock;
        // @@TODO: this way of calculating decay is completely arbitrary
        return song.allTimeUpvotes / (delta + 1);
    }
}

