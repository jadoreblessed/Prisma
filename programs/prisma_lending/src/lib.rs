use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use chainlink_solana::v2::read_feed_v2;

declare_id!("HYDdzcdDmcGJfVd5oXAKJ4MLrJQNFuekuAgvXZgNwnPG");

const BPS: u128 = 10_000;
const YEAR_SECONDS: u128 = 31_536_000;
const WAD: u128 = 1_000_000_000_000_000_000;

#[program]
pub mod prisma_lending {
    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket>, args: InitializeMarketArgs) -> Result<()> {
        require!(args.loan_to_value_bps < args.liquidation_threshold_bps, PrismaError::InvalidRiskParameters);
        require!(args.liquidation_threshold_bps < 10_000, PrismaError::InvalidRiskParameters);
        require!(args.liquidation_bonus_bps <= 2_000, PrismaError::InvalidRiskParameters);
        require!(args.borrow_rate_bps <= 5_000, PrismaError::InvalidRiskParameters);
        require!(args.max_oracle_age_seconds >= 30, PrismaError::InvalidRiskParameters);
        require!(ctx.accounts.collateral_mint.decimals <= 18, PrismaError::UnsupportedDecimals);
        require!(ctx.accounts.borrow_mint.decimals <= 18, PrismaError::UnsupportedDecimals);
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.pending_authority = Pubkey::default();
        market.collateral_mint = ctx.accounts.collateral_mint.key();
        market.borrow_mint = ctx.accounts.borrow_mint.key();
        market.oracle = ctx.accounts.oracle.key();
        market.collateral_vault = ctx.accounts.collateral_vault.key();
        market.liquidity_vault = ctx.accounts.liquidity_vault.key();
        market.loan_to_value_bps = args.loan_to_value_bps;
        market.liquidation_threshold_bps = args.liquidation_threshold_bps;
        market.liquidation_bonus_bps = args.liquidation_bonus_bps;
        market.max_oracle_age_seconds = args.max_oracle_age_seconds;
        market.borrow_rate_bps = args.borrow_rate_bps;
        market.supply_cap = 0;
        market.borrow_cap = 0;
        market.total_supplied = 0;
        market.total_borrowed = 0;
        market.total_collateral = 0;
        market.total_supply_shares = 0;
        market.total_debt_shares = 0;
        market.borrow_index_wad = WAD;
        market.last_accrual_timestamp = Clock::get()?.unix_timestamp;
        market.paused = true;
        market.bump = ctx.bumps.market;
        emit!(MarketInitialized { market: market.key(), authority: market.authority });
        Ok(())
    }

    pub fn configure_market(ctx: Context<AdminMarket>, args: ConfigureMarketArgs) -> Result<()> {
        let market = &mut ctx.accounts.market;
        if let Some(v) = args.supply_cap { require!(v >= market.total_supplied, PrismaError::CapBelowUsage); market.supply_cap = v; }
        if let Some(v) = args.borrow_cap { require!(v >= market.total_borrowed, PrismaError::CapBelowUsage); market.borrow_cap = v; }
        if let Some(v) = args.paused { market.paused = v; }
        if let Some(v) = args.max_oracle_age_seconds { require!(v >= 30, PrismaError::InvalidRiskParameters); market.max_oracle_age_seconds = v; }
        emit!(MarketConfigured { market: market.key(), paused: market.paused, supply_cap: market.supply_cap, borrow_cap: market.borrow_cap });
        Ok(())
    }

    pub fn propose_authority(ctx: Context<AdminMarket>, next: Pubkey) -> Result<()> {
        require!(next != Pubkey::default(), PrismaError::InvalidAuthority);
        ctx.accounts.market.pending_authority = next;
        Ok(())
    }

    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require_keys_eq!(ctx.accounts.pending_authority.key(), market.pending_authority, PrismaError::InvalidAuthority);
        market.authority = market.pending_authority;
        market.pending_authority = Pubkey::default();
        Ok(())
    }

    pub fn supply(ctx: Context<Supply>, amount: u64) -> Result<()> {
        require!(amount > 0, PrismaError::InvalidAmount);
        let market = &mut ctx.accounts.market;
        require!(!market.paused, PrismaError::MarketPaused);
        require!(market.total_supplied.checked_add(amount).ok_or(PrismaError::MathOverflow)? <= market.supply_cap, PrismaError::SupplyCapExceeded);
        let shares = if market.total_supply_shares == 0 || market.total_supplied == 0 {
            amount as u128
        } else {
            (amount as u128).checked_mul(market.total_supply_shares).ok_or(PrismaError::MathOverflow)?
                .checked_div(market.total_supplied as u128).ok_or(PrismaError::MathOverflow)?
        };
        require!(shares > 0, PrismaError::DepositTooSmall);
        transfer_in(&ctx.accounts.user_borrow_account, &ctx.accounts.liquidity_vault, &ctx.accounts.user, &ctx.accounts.borrow_mint, &ctx.accounts.borrow_token_program, amount)?;
        let lender = &mut ctx.accounts.lender;
        if lender.owner == Pubkey::default() { lender.owner = ctx.accounts.user.key(); lender.market = market.key(); lender.bump = ctx.bumps.lender; }
        lender.shares = lender.shares.checked_add(shares).ok_or(PrismaError::MathOverflow)?;
        market.total_supply_shares = market.total_supply_shares.checked_add(shares).ok_or(PrismaError::MathOverflow)?;
        market.total_supplied = market.total_supplied.checked_add(amount).ok_or(PrismaError::MathOverflow)?;
        emit!(Supplied { market: market.key(), user: ctx.accounts.user.key(), amount });
        Ok(())
    }

    pub fn withdraw_supply(ctx: Context<WithdrawSupply>, amount: u64) -> Result<()> {
        require!(amount > 0 && ctx.accounts.market.total_supplied > 0 && ctx.accounts.market.total_supply_shares > 0, PrismaError::InvalidAmount);
        let claim = ctx.accounts.lender.shares.checked_mul(ctx.accounts.market.total_supplied as u128).ok_or(PrismaError::MathOverflow)?
            .checked_div(ctx.accounts.market.total_supply_shares).ok_or(PrismaError::MathOverflow)?;
        require!((amount as u128) <= claim, PrismaError::InvalidAmount);
        require!(ctx.accounts.liquidity_vault.amount >= amount, PrismaError::InsufficientLiquidity);
        let shares_to_burn = (amount as u128).checked_mul(ctx.accounts.market.total_supply_shares).ok_or(PrismaError::MathOverflow)?
            .checked_add(ctx.accounts.market.total_supplied as u128 - 1).ok_or(PrismaError::MathOverflow)?
            .checked_div(ctx.accounts.market.total_supplied as u128).ok_or(PrismaError::MathOverflow)?;
        ctx.accounts.lender.shares = ctx.accounts.lender.shares.checked_sub(shares_to_burn).ok_or(PrismaError::MathOverflow)?;
        ctx.accounts.market.total_supply_shares = ctx.accounts.market.total_supply_shares.checked_sub(shares_to_burn).ok_or(PrismaError::MathOverflow)?;
        ctx.accounts.market.total_supplied = ctx.accounts.market.total_supplied.checked_sub(amount).ok_or(PrismaError::MathOverflow)?;
        transfer_out(&ctx.accounts.market, &ctx.accounts.liquidity_vault, &ctx.accounts.user_borrow_account, &ctx.accounts.borrow_mint, &ctx.accounts.borrow_token_program, amount)?;
        Ok(())
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        require!(amount > 0, PrismaError::InvalidAmount);
        require!(!ctx.accounts.market.paused, PrismaError::MarketPaused);
        transfer_in(&ctx.accounts.user_collateral_account, &ctx.accounts.collateral_vault, &ctx.accounts.user, &ctx.accounts.collateral_mint, &ctx.accounts.collateral_token_program, amount)?;
        let position = &mut ctx.accounts.position;
        if position.owner == Pubkey::default() { position.owner = ctx.accounts.user.key(); position.market = ctx.accounts.market.key(); position.bump = ctx.bumps.position; }
        position.collateral_amount = position.collateral_amount.checked_add(amount).ok_or(PrismaError::MathOverflow)?;
        ctx.accounts.market.total_collateral = ctx.accounts.market.total_collateral.checked_add(amount).ok_or(PrismaError::MathOverflow)?;
        emit!(CollateralDeposited { market: ctx.accounts.market.key(), user: ctx.accounts.user.key(), amount });
        Ok(())
    }

    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
        require!(amount > 0 && amount <= ctx.accounts.position.collateral_amount, PrismaError::InvalidAmount);
        accrue_market(&mut ctx.accounts.market)?;
        let remaining = ctx.accounts.position.collateral_amount.checked_sub(amount).ok_or(PrismaError::MathOverflow)?;
        let debt = debt_of(&ctx.accounts.position, &ctx.accounts.market)?;
        if debt > 0 {
            require!(!ctx.accounts.market.paused, PrismaError::MarketPaused);
            let price = read_price(&ctx.accounts.oracle, ctx.accounts.market.max_oracle_age_seconds)?;
            require_healthy(remaining, debt, price, ctx.accounts.collateral_mint.decimals, ctx.accounts.borrow_mint.decimals, ctx.accounts.market.loan_to_value_bps)?;
        }
        ctx.accounts.position.collateral_amount = remaining;
        ctx.accounts.market.total_collateral = ctx.accounts.market.total_collateral.checked_sub(amount).ok_or(PrismaError::MathOverflow)?;
        transfer_out(&ctx.accounts.market, &ctx.accounts.collateral_vault, &ctx.accounts.user_collateral_account, &ctx.accounts.collateral_mint, &ctx.accounts.collateral_token_program, amount)?;
        Ok(())
    }

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        require!(amount > 0, PrismaError::InvalidAmount);
        let market = &mut ctx.accounts.market;
        require!(!market.paused, PrismaError::MarketPaused);
        require!(ctx.accounts.liquidity_vault.amount >= amount, PrismaError::InsufficientLiquidity);
        accrue_market(market)?;
        require!(market.total_borrowed.checked_add(amount).ok_or(PrismaError::MathOverflow)? <= market.borrow_cap, PrismaError::BorrowCapExceeded);
        let price = read_price(&ctx.accounts.oracle, market.max_oracle_age_seconds)?;
        let current_debt = debt_of(&ctx.accounts.position, market)?;
        let new_debt = current_debt.checked_add(amount).ok_or(PrismaError::MathOverflow)?;
        require_healthy(ctx.accounts.position.collateral_amount, new_debt, price, ctx.accounts.collateral_mint.decimals, ctx.accounts.borrow_mint.decimals, market.loan_to_value_bps)?;
        let shares = (amount as u128).checked_mul(WAD).ok_or(PrismaError::MathOverflow)?
            .checked_add(market.borrow_index_wad - 1).ok_or(PrismaError::MathOverflow)?
            .checked_div(market.borrow_index_wad).ok_or(PrismaError::MathOverflow)?;
        ctx.accounts.position.debt_shares = ctx.accounts.position.debt_shares.checked_add(shares).ok_or(PrismaError::MathOverflow)?;
        market.total_debt_shares = market.total_debt_shares.checked_add(shares).ok_or(PrismaError::MathOverflow)?;
        market.total_borrowed = debt_from_shares(market.total_debt_shares, market.borrow_index_wad)?;
        transfer_out(market, &ctx.accounts.liquidity_vault, &ctx.accounts.user_borrow_account, &ctx.accounts.borrow_mint, &ctx.accounts.borrow_token_program, amount)?;
        emit!(Borrowed { market: market.key(), user: ctx.accounts.user.key(), amount });
        Ok(())
    }

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        accrue_market(&mut ctx.accounts.market)?;
        let current_debt = debt_of(&ctx.accounts.position, &ctx.accounts.market)?;
        let requested = amount.min(current_debt);
        require!(requested > 0, PrismaError::InvalidAmount);
        let shares_to_burn = if requested == current_debt { ctx.accounts.position.debt_shares } else {
            (requested as u128).checked_mul(WAD).ok_or(PrismaError::MathOverflow)?.checked_div(ctx.accounts.market.borrow_index_wad).ok_or(PrismaError::MathOverflow)?
        };
        require!(shares_to_burn > 0, PrismaError::RepayTooSmall);
        let remaining_shares = ctx.accounts.position.debt_shares.checked_sub(shares_to_burn).ok_or(PrismaError::MathOverflow)?;
        let remaining_debt = debt_from_shares(remaining_shares, ctx.accounts.market.borrow_index_wad)?;
        let repaid = current_debt.checked_sub(remaining_debt).ok_or(PrismaError::MathOverflow)?;
        transfer_in(&ctx.accounts.user_borrow_account, &ctx.accounts.liquidity_vault, &ctx.accounts.user, &ctx.accounts.borrow_mint, &ctx.accounts.borrow_token_program, repaid)?;
        ctx.accounts.position.debt_shares = remaining_shares;
        ctx.accounts.market.total_debt_shares = ctx.accounts.market.total_debt_shares.checked_sub(shares_to_burn).ok_or(PrismaError::MathOverflow)?;
        ctx.accounts.market.total_borrowed = debt_from_shares(ctx.accounts.market.total_debt_shares, ctx.accounts.market.borrow_index_wad)?;
        emit!(Repaid { market: ctx.accounts.market.key(), user: ctx.accounts.user.key(), amount: repaid });
        Ok(())
    }

    pub fn liquidate(ctx: Context<Liquidate>, requested_repay: u64) -> Result<()> {
        require!(!ctx.accounts.market.paused, PrismaError::MarketPaused);
        require!(requested_repay > 0, PrismaError::InvalidAmount);
        accrue_market(&mut ctx.accounts.market)?;
        let price = read_price(&ctx.accounts.oracle, ctx.accounts.market.max_oracle_age_seconds)?;
        let position = &mut ctx.accounts.position;
        let liquidation_capacity = debt_capacity(
            position.collateral_amount,
            price,
            ctx.accounts.collateral_mint.decimals,
            ctx.accounts.borrow_mint.decimals,
            ctx.accounts.market.liquidation_threshold_bps,
        )?;
        let current_debt = debt_of(position, &ctx.accounts.market)?;
        require!((current_debt as u128) > liquidation_capacity, PrismaError::PositionHealthy);
        let requested = requested_repay.min(current_debt);
        let shares_to_burn = if requested == current_debt { position.debt_shares } else {
            (requested as u128).checked_mul(WAD).ok_or(PrismaError::MathOverflow)?.checked_div(ctx.accounts.market.borrow_index_wad).ok_or(PrismaError::MathOverflow)?
        };
        require!(shares_to_burn > 0, PrismaError::RepayTooSmall);
        let remaining_shares = position.debt_shares.checked_sub(shares_to_burn).ok_or(PrismaError::MathOverflow)?;
        let remaining_debt = debt_from_shares(remaining_shares, ctx.accounts.market.borrow_index_wad)?;
        let repay_amount = current_debt.checked_sub(remaining_debt).ok_or(PrismaError::MathOverflow)?;
        let base_collateral = (repay_amount as u128)
            .checked_mul(10u128.pow(ctx.accounts.collateral_mint.decimals as u32)).ok_or(PrismaError::MathOverflow)?
            .checked_mul(10u128.pow(price.decimals as u32)).ok_or(PrismaError::MathOverflow)?
            .checked_div(price.value).ok_or(PrismaError::MathOverflow)?
            .checked_div(10u128.pow(ctx.accounts.borrow_mint.decimals as u32)).ok_or(PrismaError::MathOverflow)?;
        let seize = base_collateral
            .checked_mul(BPS + ctx.accounts.market.liquidation_bonus_bps as u128).ok_or(PrismaError::MathOverflow)?
            .checked_div(BPS).ok_or(PrismaError::MathOverflow)?
            .min(position.collateral_amount as u128) as u64;
        transfer_in(&ctx.accounts.liquidator_borrow_account, &ctx.accounts.liquidity_vault, &ctx.accounts.liquidator, &ctx.accounts.borrow_mint, &ctx.accounts.borrow_token_program, repay_amount)?;
        position.debt_shares = remaining_shares;
        ctx.accounts.market.total_debt_shares = ctx.accounts.market.total_debt_shares.checked_sub(shares_to_burn).ok_or(PrismaError::MathOverflow)?;
        position.collateral_amount = position.collateral_amount.checked_sub(seize).ok_or(PrismaError::MathOverflow)?;
        ctx.accounts.market.total_borrowed = debt_from_shares(ctx.accounts.market.total_debt_shares, ctx.accounts.market.borrow_index_wad)?;
        ctx.accounts.market.total_collateral = ctx.accounts.market.total_collateral.checked_sub(seize).ok_or(PrismaError::MathOverflow)?;
        transfer_out(&ctx.accounts.market, &ctx.accounts.collateral_vault, &ctx.accounts.liquidator_collateral_account, &ctx.accounts.collateral_mint, &ctx.accounts.collateral_token_program, seize)?;
        emit!(Liquidated { market: ctx.accounts.market.key(), borrower: position.owner, liquidator: ctx.accounts.liquidator.key(), repaid: repay_amount, seized: seize });
        Ok(())
    }
}

fn read_price(feed: &UncheckedAccount, max_age: u32) -> Result<OraclePrice> {
    let data = feed.try_borrow_data()?;
    let parsed = read_feed_v2(data, feed.owner.to_bytes()).map_err(|_| error!(PrismaError::OracleReadFailed))?;
    let round = parsed.latest_round_data().ok_or(PrismaError::OracleRoundMissing)?;
    require!(round.answer > 0, PrismaError::InvalidOraclePrice);
    let now = Clock::get()?.unix_timestamp;
    require!(now.saturating_sub(round.timestamp as i64) <= max_age as i64, PrismaError::StaleOraclePrice);
    require!(parsed.decimals() <= 18, PrismaError::UnsupportedDecimals);
    Ok(OraclePrice { value: round.answer as u128, decimals: parsed.decimals() })
}

fn accrue_market(market: &mut Account<Market>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    if market.total_borrowed == 0 { market.last_accrual_timestamp = now; return Ok(()); }
    let elapsed = now.saturating_sub(market.last_accrual_timestamp) as u128;
    if elapsed == 0 { return Ok(()); }
    let rate_factor = (market.borrow_rate_bps as u128)
        .checked_mul(elapsed).ok_or(PrismaError::MathOverflow)?
        .checked_mul(WAD).ok_or(PrismaError::MathOverflow)?
        .checked_div(BPS).ok_or(PrismaError::MathOverflow)?
        .checked_div(YEAR_SECONDS).ok_or(PrismaError::MathOverflow)?;
    market.borrow_index_wad = market.borrow_index_wad
        .checked_mul(WAD.checked_add(rate_factor).ok_or(PrismaError::MathOverflow)?).ok_or(PrismaError::MathOverflow)?
        .checked_div(WAD).ok_or(PrismaError::MathOverflow)?;
    let indexed_debt = market.total_debt_shares.checked_mul(market.borrow_index_wad).ok_or(PrismaError::MathOverflow)?
        .checked_add(WAD - 1).ok_or(PrismaError::MathOverflow)?
        .checked_div(WAD).ok_or(PrismaError::MathOverflow)?;
    let new_total_borrowed = u64::try_from(indexed_debt).map_err(|_| error!(PrismaError::MathOverflow))?;
    let interest_u64 = new_total_borrowed.saturating_sub(market.total_borrowed);
    market.total_borrowed = new_total_borrowed;
    market.total_supplied = market.total_supplied.checked_add(interest_u64).ok_or(PrismaError::MathOverflow)?;
    market.last_accrual_timestamp = now;
    Ok(())
}

fn debt_of(position: &Account<Position>, market: &Account<Market>) -> Result<u64> {
    debt_from_shares(position.debt_shares, market.borrow_index_wad)
}

fn debt_from_shares(shares: u128, index_wad: u128) -> Result<u64> {
    let debt = shares.checked_mul(index_wad).ok_or(PrismaError::MathOverflow)?
        .checked_add(WAD - 1).ok_or(PrismaError::MathOverflow)?
        .checked_div(WAD).ok_or(PrismaError::MathOverflow)?;
    u64::try_from(debt).map_err(|_| error!(PrismaError::MathOverflow))
}

fn require_healthy(collateral: u64, debt: u64, price: OraclePrice, collateral_decimals: u8, borrow_decimals: u8, ltv_bps: u16) -> Result<()> {
    if debt == 0 { return Ok(()); }
    let capacity = debt_capacity(collateral, price, collateral_decimals, borrow_decimals, ltv_bps)?;
    require!((debt as u128) <= capacity, PrismaError::PositionUnhealthy);
    Ok(())
}

fn debt_capacity(collateral: u64, price: OraclePrice, collateral_decimals: u8, borrow_decimals: u8, ratio_bps: u16) -> Result<u128> {
    let collateral_value = (collateral as u128).checked_mul(price.value).ok_or(PrismaError::MathOverflow)?
        .checked_mul(10u128.pow(borrow_decimals as u32)).ok_or(PrismaError::MathOverflow)?
        .checked_div(10u128.pow(collateral_decimals as u32)).ok_or(PrismaError::MathOverflow)?
        .checked_div(10u128.pow(price.decimals as u32)).ok_or(PrismaError::MathOverflow)?;
    collateral_value.checked_mul(ratio_bps as u128).ok_or(error!(PrismaError::MathOverflow))?.checked_div(BPS).ok_or(error!(PrismaError::MathOverflow))
}

fn transfer_in<'info>(from: &InterfaceAccount<'info, TokenAccount>, to: &InterfaceAccount<'info, TokenAccount>, authority: &Signer<'info>, mint: &InterfaceAccount<'info, Mint>, token_program: &Interface<'info, TokenInterface>, amount: u64) -> Result<()> {
    token_interface::transfer_checked(CpiContext::new(token_program.to_account_info(), TransferChecked { from: from.to_account_info(), mint: mint.to_account_info(), to: to.to_account_info(), authority: authority.to_account_info() }), amount, mint.decimals)
}

fn transfer_out<'info>(market: &Account<'info, Market>, from: &InterfaceAccount<'info, TokenAccount>, to: &InterfaceAccount<'info, TokenAccount>, mint: &InterfaceAccount<'info, Mint>, token_program: &Interface<'info, TokenInterface>, amount: u64) -> Result<()> {
    let seeds: &[&[u8]] = &[b"market", market.collateral_mint.as_ref(), market.borrow_mint.as_ref(), &[market.bump]];
    token_interface::transfer_checked(CpiContext::new_with_signer(token_program.to_account_info(), TransferChecked { from: from.to_account_info(), mint: mint.to_account_info(), to: to.to_account_info(), authority: market.to_account_info() }, &[seeds]), amount, mint.decimals)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeMarketArgs { pub loan_to_value_bps: u16, pub liquidation_threshold_bps: u16, pub liquidation_bonus_bps: u16, pub max_oracle_age_seconds: u32, pub borrow_rate_bps: u16 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ConfigureMarketArgs { pub supply_cap: Option<u64>, pub borrow_cap: Option<u64>, pub paused: Option<bool>, pub max_oracle_age_seconds: Option<u32> }

#[account]
#[derive(InitSpace)]
pub struct Market { pub authority: Pubkey, pub pending_authority: Pubkey, pub collateral_mint: Pubkey, pub borrow_mint: Pubkey, pub oracle: Pubkey, pub collateral_vault: Pubkey, pub liquidity_vault: Pubkey, pub total_collateral: u64, pub total_supplied: u64, pub total_borrowed: u64, pub total_supply_shares: u128, pub total_debt_shares: u128, pub borrow_index_wad: u128, pub last_accrual_timestamp: i64, pub supply_cap: u64, pub borrow_cap: u64, pub loan_to_value_bps: u16, pub liquidation_threshold_bps: u16, pub liquidation_bonus_bps: u16, pub borrow_rate_bps: u16, pub max_oracle_age_seconds: u32, pub paused: bool, pub bump: u8 }
#[account]
#[derive(InitSpace)]
pub struct Position { pub owner: Pubkey, pub market: Pubkey, pub collateral_amount: u64, pub debt_shares: u128, pub bump: u8 }
#[account]
#[derive(InitSpace)]
pub struct Lender { pub owner: Pubkey, pub market: Pubkey, pub shares: u128, pub bump: u8 }
#[derive(Clone, Copy)]
struct OraclePrice { value: u128, decimals: u8 }

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    pub collateral_mint: InterfaceAccount<'info, Mint>,
    pub borrow_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: verified by Chainlink consumer library when price is read
    pub oracle: UncheckedAccount<'info>,
    #[account(init, payer=authority, space=8+Market::INIT_SPACE, seeds=[b"market", collateral_mint.key().as_ref(), borrow_mint.key().as_ref()], bump)] pub market: Account<'info, Market>,
    #[account(init, payer=authority, token::mint=collateral_mint, token::authority=market, token::token_program=collateral_token_program, seeds=[b"collateral-vault", market.key().as_ref()], bump)] pub collateral_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(init, payer=authority, token::mint=borrow_mint, token::authority=market, token::token_program=borrow_token_program, seeds=[b"liquidity-vault", market.key().as_ref()], bump)] pub liquidity_vault: InterfaceAccount<'info, TokenAccount>,
    pub collateral_token_program: Interface<'info, TokenInterface>,
    pub borrow_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminMarket<'info> { #[account(mut, has_one=authority)] pub market: Account<'info, Market>, pub authority: Signer<'info> }
#[derive(Accounts)]
pub struct AcceptAuthority<'info> { #[account(mut)] pub market: Account<'info, Market>, pub pending_authority: Signer<'info> }

#[derive(Accounts)]
pub struct Supply<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut, has_one=borrow_mint, has_one=liquidity_vault)] pub market: Account<'info, Market>,
    pub borrow_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint=borrow_mint, token::authority=user)] pub user_borrow_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)] pub liquidity_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(init_if_needed, payer=user, space=8+Lender::INIT_SPACE, seeds=[b"lender", market.key().as_ref(), user.key().as_ref()], bump)] pub lender: Account<'info, Lender>,
    pub borrow_token_program: Interface<'info, TokenInterface>, pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSupply<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut, has_one=borrow_mint, has_one=liquidity_vault)] pub market: Account<'info, Market>,
    pub borrow_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds=[b"lender", market.key().as_ref(), user.key().as_ref()], bump=lender.bump, constraint=lender.owner==user.key()@PrismaError::InvalidAuthority, constraint=lender.market==market.key()@PrismaError::InvalidAuthority)] pub lender: Account<'info, Lender>,
    #[account(mut)] pub liquidity_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint=borrow_mint, token::authority=user)] pub user_borrow_account: InterfaceAccount<'info, TokenAccount>,
    pub borrow_token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut, has_one=collateral_mint, has_one=collateral_vault)] pub market: Account<'info, Market>,
    pub collateral_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint=collateral_mint, token::authority=user)] pub user_collateral_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)] pub collateral_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(init_if_needed, payer=user, space=8+Position::INIT_SPACE, seeds=[b"position", market.key().as_ref(), user.key().as_ref()], bump)] pub position: Account<'info, Position>,
    pub collateral_token_program: Interface<'info, TokenInterface>, pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut, has_one=collateral_mint, has_one=borrow_mint, has_one=oracle, has_one=collateral_vault)] pub market: Account<'info, Market>,
    pub collateral_mint: InterfaceAccount<'info, Mint>, pub borrow_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: constrained by market and parsed by Chainlink
    pub oracle: UncheckedAccount<'info>,
    #[account(mut, seeds=[b"position", market.key().as_ref(), user.key().as_ref()], bump=position.bump, constraint=position.owner==user.key()@PrismaError::InvalidAuthority, constraint=position.market==market.key()@PrismaError::InvalidAuthority)] pub position: Account<'info, Position>,
    #[account(mut)] pub collateral_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint=collateral_mint, token::authority=user)] pub user_collateral_account: InterfaceAccount<'info, TokenAccount>,
    pub collateral_token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut, has_one=collateral_mint, has_one=borrow_mint, has_one=oracle, has_one=liquidity_vault)] pub market: Account<'info, Market>,
    pub collateral_mint: InterfaceAccount<'info, Mint>, pub borrow_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: constrained by market and parsed by Chainlink
    pub oracle: UncheckedAccount<'info>,
    #[account(mut, seeds=[b"position", market.key().as_ref(), user.key().as_ref()], bump=position.bump, constraint=position.owner==user.key()@PrismaError::InvalidAuthority, constraint=position.market==market.key()@PrismaError::InvalidAuthority)] pub position: Account<'info, Position>,
    #[account(mut)] pub liquidity_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint=borrow_mint, token::authority=user)] pub user_borrow_account: InterfaceAccount<'info, TokenAccount>,
    pub borrow_token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut, has_one=borrow_mint, has_one=liquidity_vault)] pub market: Account<'info, Market>,
    pub borrow_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds=[b"position", market.key().as_ref(), user.key().as_ref()], bump=position.bump, constraint=position.owner==user.key()@PrismaError::InvalidAuthority, constraint=position.market==market.key()@PrismaError::InvalidAuthority)] pub position: Account<'info, Position>,
    #[account(mut)] pub liquidity_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint=borrow_mint, token::authority=user)] pub user_borrow_account: InterfaceAccount<'info, TokenAccount>,
    pub borrow_token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)] pub liquidator: Signer<'info>,
    /// CHECK: key is bound to the position owner and PDA seeds
    pub borrower: UncheckedAccount<'info>,
    #[account(mut, has_one=collateral_mint, has_one=borrow_mint, has_one=oracle, has_one=collateral_vault, has_one=liquidity_vault)] pub market: Account<'info, Market>,
    pub collateral_mint: InterfaceAccount<'info, Mint>, pub borrow_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: constrained by market and parsed by Chainlink
    pub oracle: UncheckedAccount<'info>,
    #[account(mut, seeds=[b"position", market.key().as_ref(), borrower.key().as_ref()], bump=position.bump, constraint=position.owner==borrower.key()@PrismaError::InvalidAuthority, constraint=position.market==market.key()@PrismaError::InvalidAuthority)] pub position: Account<'info, Position>,
    #[account(mut)] pub collateral_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)] pub liquidity_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint=borrow_mint, token::authority=liquidator)] pub liquidator_borrow_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint=collateral_mint, token::authority=liquidator)] pub liquidator_collateral_account: InterfaceAccount<'info, TokenAccount>,
    pub collateral_token_program: Interface<'info, TokenInterface>, pub borrow_token_program: Interface<'info, TokenInterface>,
}

#[event] pub struct MarketInitialized { pub market: Pubkey, pub authority: Pubkey }
#[event] pub struct MarketConfigured { pub market: Pubkey, pub paused: bool, pub supply_cap: u64, pub borrow_cap: u64 }
#[event] pub struct Supplied { pub market: Pubkey, pub user: Pubkey, pub amount: u64 }
#[event] pub struct CollateralDeposited { pub market: Pubkey, pub user: Pubkey, pub amount: u64 }
#[event] pub struct Borrowed { pub market: Pubkey, pub user: Pubkey, pub amount: u64 }
#[event] pub struct Repaid { pub market: Pubkey, pub user: Pubkey, pub amount: u64 }
#[event] pub struct Liquidated { pub market: Pubkey, pub borrower: Pubkey, pub liquidator: Pubkey, pub repaid: u64, pub seized: u64 }

#[error_code]
pub enum PrismaError {
    #[msg("Market is paused")] MarketPaused,
    #[msg("Invalid amount")] InvalidAmount,
    #[msg("Deposit is too small to mint a lender share")] DepositTooSmall,
    #[msg("Repayment is too small to burn a debt share")] RepayTooSmall,
    #[msg("Invalid risk parameters")] InvalidRiskParameters,
    #[msg("Supply cap exceeded")] SupplyCapExceeded,
    #[msg("Borrow cap exceeded")] BorrowCapExceeded,
    #[msg("Cap is below current usage")] CapBelowUsage,
    #[msg("Insufficient market liquidity")] InsufficientLiquidity,
    #[msg("Position would be unhealthy")] PositionUnhealthy,
    #[msg("Position is healthy and cannot be liquidated")] PositionHealthy,
    #[msg("Oracle price is stale")] StaleOraclePrice,
    #[msg("Oracle price is invalid")] InvalidOraclePrice,
    #[msg("Oracle read failed")] OracleReadFailed,
    #[msg("Oracle has no completed round")] OracleRoundMissing,
    #[msg("Math overflow")] MathOverflow,
    #[msg("Invalid authority")] InvalidAuthority,
    #[msg("Token or oracle decimals above 18 are unsupported")] UnsupportedDecimals,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nvda_capacity_uses_mint_and_oracle_decimals() {
        let price = OraclePrice { value: 120_00000000, decimals: 8 };
        let capacity = debt_capacity(1_000000, price, 6, 6, 5_000).unwrap();
        assert_eq!(capacity, 60_000000);
    }

    #[test]
    fn liquidation_threshold_exceeds_opening_ltv() {
        let price = OraclePrice { value: 120_00000000, decimals: 8 };
        let opening = debt_capacity(1_000000, price, 6, 6, 5_000).unwrap();
        let liquidation = debt_capacity(1_000000, price, 6, 6, 6_250).unwrap();
        assert!(liquidation > opening);
    }
}
