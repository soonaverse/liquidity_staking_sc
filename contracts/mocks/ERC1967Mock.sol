import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// mock contract to get ERC1967Proxy bytecode available in hardhat tests
abstract contract ERC1967Mock is ERC1967Proxy {
}