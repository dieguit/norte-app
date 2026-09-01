# NORTE

NORTE is a personal financial-planning product. It helps a person understand whether their recorded actions and current plan lead toward their financial goals.

## Planning

**Goal**:
A future financial outcome the person is working toward, with a current value, an optional target, and a share of their planned contributions. An initial Goal is either an emergency fund, whose target derives from known monthly expenses, or a fixed-target savings Goal, including changing a car.
_Avoid_: Category, bucket

**Plan**:
The current forward-looking monthly contribution and allocation across active goals. It represents intent, not money actually saved or invested.
_Avoid_: Actual progress, balance

**Actual contribution**:
A recorded saving or investment action that changes goal progress. Historical
allocations are retained as part of the action; an explicit correction may
update that action without applying the current Plan retroactively.
_Avoid_: Planned contribution, estimated margin

**Savings place**:
A user-owned container that identifies where saved money is held. Its ARS and
USD balances are derived from recorded saving contributions, transfers, and
Goal completion withdrawals; it does not determine how that money is allocated
across Goals before completion.
_Avoid_: Goal, allocation bucket, bank account integration

**Savings transfer**:
An immutable movement of saved money between two Savings places in the same
currency. It changes where the money is held without changing Goal progress or
historical contribution allocations.
_Avoid_: Contribution, expense, Goal completion

**Goal completion**:
The explicit, irreversible confirmation that a person used the target savings
to fulfill an eligible Goal. It records completion withdrawals from the Savings
places selected at that moment, marks the Goal completed, and removes it from
the future Plan.
_Avoid_: Reaching a projection, pausing a Goal, Savings transfer

**Goal completion withdrawal**:
An immutable deduction from a Savings place recorded as part of Goal
completion. Its Savings place is chosen at completion rather than inferred from
historical contributions or transfers, and it does not erase contribution
history.
_Avoid_: Savings transfer, contribution correction, Goal allocation

**Trajectory**:
The projected path from current financial state and the current plan to each goal's completion state.
_Avoid_: Budget, financial health score

**Roadmap**:
The user-facing timeline that explains actual actions, current state, projected changes, milestones, and goal completion along the trajectory.
_Avoid_: Transaction history, activity feed

**Impact preview**:
A before-and-after comparison of projected goal outcomes shown before a trajectory-changing plan change is persisted.
_Avoid_: Confirmation dialog
