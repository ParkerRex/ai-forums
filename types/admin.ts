// Member type
export interface Member {
	id: string;
	_id?: string;
	firstName: string;
	lastName: string;
	email: string;
	username?: string;
	slug: string;
	avatarUrl?: string | null;
	bio?: string | null;
	tier?: "founding_member" | "early_bird" | "member" | null;
	role?: "admin" | "user" | "member" | null;
	status: "active" | "cancelled" | "churned" | "duplicate";
	postCount?: number;
	commentCount?: number;
	netVoteCount?: number;
	joinedDate?: number | string | null;
	lastOnline?: number | string | null;
	location?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

// Subscription type
export interface Subscription {
	id: string;
	_id?: string;
	memberId: string;
	stripeSubscriptionId: string;
	stripeCustomerId?: string;
	tier?: string;
	billingInterval?: string;
	status: string;
	currentPeriodStart: string | number;
	currentPeriodEnd: string | number;
	cancelAtPeriodEnd: boolean;
	createdAt: string | number;
}

// Payment type
export interface Payment {
	id: string;
	_id?: string;
	memberId: string;
	stripePaymentId?: string;
	amount: number;
	currency?: string;
	status: string;
	description?: string;
	createdAt: string | number;
}

// Member with computed status
export type MemberWithStatus = Member & {
	_id: string;
	status: "active" | "cancelled" | "churned";
	subscription?: Subscription | null;
	billingInterval?: string | null;
	subscriptionStatus?: string | null;
	subscriptionEndDate?: number | null;
	amountCents?: number | null;
};

// Payment with member info
export type PaymentWithMember = Payment & {
	member: {
		id: string;
		firstName?: string;
		lastName?: string;
		email: string;
		tier?: Member["tier"];
	} | null;
};

// Activity item types
export type ActivityPost = {
	id?: string;
	_id?: string;
	title: string;
	slug?: string;
	createdAt: string | number;
};

export type ActivityComment = {
	id?: string;
	_id?: string;
	content: string;
	createdAt: string | number;
};

// Member details response
export type MemberDetailsResponse = {
	member: Member;
	status: "active" | "cancelled" | "churned";
	subscription: Subscription | null;
	payments: Payment[];
	activity: {
		posts: ActivityPost[];
		comments: ActivityComment[];
		postCount: number;
		commentCount: number;
	};
};

// Payment details response
export type PaymentDetailsResponse = {
	payment: Payment;
	member: Member | null;
	subscription: Subscription | null;
};

// Membership stats
export type MembershipStats = {
	totalMembers: number;
	tierStats: {
		founding_member: number;
		early_bird: number;
		member: number;
	};
	statusStats: {
		active: number;
		cancelled: number;
		churned: number;
	};
	revenue: {
		mrr: number;
		monthlyRevenue: number;
		yearlyRevenue: number;
		formattedMrr: string;
		formattedMonthly: string;
		formattedYearly: string;
	};
};

// Payment stats
export type PaymentStats = {
	totalPayments: number;
	successfulPayments: number;
	failedPayments: number;
	refundedPayments: number;
	revenue: {
		gross: number;
		refunds: number;
		fees: number;
		net: number;
		formattedGross: string;
		formattedRefunds: string;
		formattedFees: string;
		formattedNet: string;
	};
	averagePayment: number;
	formattedAveragePayment: string;
};

// Refund eligibility
export type RefundEligibility =
	| { eligible: false; reason: string }
	| {
			eligible: true;
			maxRefundAmount: number;
			alreadyRefunded: number;
			originalAmount: number;
	  };
