import "./MintableToken.sol";

contract UpvoteToken is MintableToken
{
    string public name = "Upvote";
    string public symbol = "VOTE";
    uint8 public decimals = 18;

    constructor(address mintMaster)
        MintableToken(mintMaster)
    {
        totalSupply = 0;
    }
}

