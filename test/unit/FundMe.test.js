const { deployments, ethers, network, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

// unit tests only run on development chains
!developmentChains.includes(network.name) ?
    describe.skip :
    describe("FundMe", function() {
        let fundMe
        let deployer
        const sendValue = ethers.utils.parseEther("1") // converts 1 to 1e18

        beforeEach(async function() {
            // deploy our fundMe contract
            // using Hardhat-deploy
            // const accounts = await ethers.getSigners()
            // const accountZero = accounts[0]
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture("all") // deploy all the contracts with the "all" tag
            fundMe = await ethers.getContract("FundMe", deployer) // associate the contract with FundMe
            mockV3Aggregator = await ethers.getContract(
                "MockV3Aggregator",
                deployer
            )
        })

        describe("constructor", function() {
            it("Sets the aggregator addresses correctly", async function() {
                const response = await fundMe.getPriceFeed()
                assert.equal(response, mockV3Aggregator.address)
            })
        })

        describe("fund", function() {
            it("Fails if you don't send enough ETH", async function() {
                await expect(fundMe.fund()).to.be.revertedWith(
                    "Didn't send enough"
                )
            })

            it("updated the amount funded data structure", async function() {
                await fundMe.fund({ value: sendValue })
                const response = await fundMe.getAddressToAmountFunded(
                    deployer
                )
                assert.equal(response.toString(), sendValue.toString())
            })

            it("Adds a funder to array of getFunder", async function() {
                await fundMe.fund({ value: sendValue })
                const funder = await fundMe.getFunder(0) // interesting how you get the first element
                assert.equal(funder, deployer)
            })
        })

        describe("withdraw", function() {
            beforeEach(async function() {
                await fundMe.fund({ value: sendValue })
            })

            it("Withdraw ETH from a single founder", async function() {
                // Arrange
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(
                        // we can also use ethers.provider as well
                        fundMe.address
                    )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)

                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Assert
                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingDeployerBalance
                    .add(startingFundMeBalance)
                    .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )
            })

            it("allows us to withdraw with multiple getFunder", async function() {
                // Arrange
                const accounts = await ethers.getSigners()
                for (let i = 1; i < 6; i++) {
                    // 0th index is deployer
                    const fundMeConnectedContract = await fundMe.connect(
                            accounts[i]
                        ) // fundMe contract is connected to the deployer account
                    await fundMeConnectedContract.fund({ value: sendValue })
                }
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(
                        // we can also use ethers.provider as well
                        fundMe.address
                    )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)

                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Assert
                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingDeployerBalance
                    .add(startingFundMeBalance)
                    .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )

                // Make sure that the getFunder are reset properly
                await expect(fundMe.getFunder(0)).to.be.reverted

                for (let i = 1; i < 6; i++) {
                    assert.equal(
                        await fundMe.getAddressToAmountFunded(
                            accounts[i].address
                        ),
                        0
                    )
                }
            })

            it("Only allows the owner to withdraw", async function() {
                const accounts = await ethers.getSigners()
                const attacker = accounts[1]
                const attackerConnectedContract = await fundMe.connect(
                    attacker
                )
                await expect(
                    attackerConnectedContract.withdraw()
                ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
            })

            it("Cheaper withdraw ETH from a single founder", async function() {
                // Arrange
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(
                        // we can also use ethers.provider as well
                        fundMe.address
                    )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.cheaperWithdraw()
                const transactionReceipt = await transactionResponse.wait(1)

                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Assert
                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingDeployerBalance
                    .add(startingFundMeBalance)
                    .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )
            })

            it("cheaperWithdraw testing...", async function() {
                // Arrange
                const accounts = await ethers.getSigners()
                for (let i = 1; i < 6; i++) {
                    // 0th index is deployer
                    const fundMeConnectedContract = await fundMe.connect(
                            accounts[i]
                        ) // fundMe contract is connected to the deployer account
                    await fundMeConnectedContract.fund({ value: sendValue })
                }
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(
                        // we can also use ethers.provider as well
                        fundMe.address
                    )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.cheaperWithdraw()
                const transactionReceipt = await transactionResponse.wait(1)

                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Assert
                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingDeployerBalance
                    .add(startingFundMeBalance)
                    .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )

                // Make sure that the getFunder are reset properly
                await expect(fundMe.getFunder(0)).to.be.reverted

                for (let i = 1; i < 6; i++) {
                    assert.equal(
                        await fundMe.getAddressToAmountFunded(
                            accounts[i].address
                        ),
                        0
                    )
                }
            })
        })
    })