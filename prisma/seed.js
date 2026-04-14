"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/** Default 10-currency basket weights (docs); used only for initial seed. Runtime uses BasketConfig from DB. */
const INITIAL_BASKET = [
    { currency: 'NGN', weight: 18 },
    { currency: 'ZAR', weight: 15 },
    { currency: 'KES', weight: 12 },
    { currency: 'EGP', weight: 11 },
    { currency: 'GHS', weight: 9 },
    { currency: 'RWF', weight: 8 },
    { currency: 'XOF', weight: 8 },
    { currency: 'MAD', weight: 7 },
    { currency: 'TZS', weight: 6 },
    { currency: 'UGX', weight: 6 },
];
async function main() {
    console.log('Seeding database...');
    const existing = await prisma.basketConfig.findFirst({ where: { status: 'active' } });
    if (!existing) {
        const effectiveFrom = new Date(0); // epoch so "current" from start
        for (const { currency, weight } of INITIAL_BASKET) {
            await prisma.basketConfig.create({
                data: {
                    effectiveFrom,
                    currency,
                    weight,
                    status: 'active',
                },
            });
        }
        console.log('Seeded initial 10-currency basket (BasketConfig).');
    }
    console.log('Seeding completed.');
}
main()
    .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map