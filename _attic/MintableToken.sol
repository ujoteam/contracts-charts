import "./ERC20Token.sol";

contract MintableToken is ERC20Token
{
    address public mintMaster;

    constructor(address _mintMaster) {
        mintMaster = _mintMaster;
    }

    function mint(uint amount, address recipient) public {
        require(msg.sender == mintMaster, "only the mintMaster can mint");

        totalSupply += amount;
        balances[recipient] += amount;

        Transfer(address(0), recipient, amount);
    }

    function setMintMaster(address newMintMaster) public {
        require(msg.sender == mintMaster, "only the mintMaster can set a new mintMaster");

        mintMaster = newMintMaster;
    }
}
