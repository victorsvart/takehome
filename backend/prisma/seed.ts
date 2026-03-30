import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.property.findUnique({
    where: { name: 'Park Meadows Apartments' },
    select: { id: true },
  });

  if (existing) {
    // DECISION: Rebuild the canonical seeded property on every run so reviewers
    // get deterministic scenarios and acceptance counts without manual cleanup.
    await clearSeedProperty(existing.id);
  }

  const property = await prisma.property.create({
    data: {
      name: 'Park Meadows Apartments',
      address: '123 Main St',
      city: 'Denver',
      state: 'CO',
      zipCode: '80206',
      status: 'active',
    },
  });

  const unitType = await prisma.unitType.create({
    data: {
      propertyId: property.id,
      name: '1BR/1BA',
      bedrooms: 1,
      bathrooms: '1.0',
      squareFootage: 700,
    },
  });

  const units: Array<{ id: string; unitNumber: string }> = [];
  for (let index = 1; index <= 20; index += 1) {
    const unitNumber = String(100 + index);
    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        unitTypeId: unitType.id,
        unitNumber,
        floor: Math.floor(index / 10) + 1,
        status: 'occupied',
      },
    });
    units.push({ id: unit.id, unitNumber });
  }

  await prisma.unitPricing.createMany({
    data: units.map((unit) => ({
      unitId: unit.id,
      baseRent: 1600,
      marketRent: 1600,
      effectiveDate: new Date(),
    })),
  });

  // DECISION: This scenario set is intentionally deterministic and calibrated to
  // produce a non-empty, mixed-risk dataset for the take-home checks.
  const scenarios: Array<{
    firstName: string;
    lastName: string;
    email: string;
    monthlyRent: number;
    daysToExpiry: number;
    leaseType: 'fixed' | 'month_to_month';
    paymentsInLastSixMonths: number;
    createRenewalOffer: boolean;
  }> = [
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      monthlyRent: 1400,
      daysToExpiry: 45,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: false,
    },
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      monthlyRent: 1500,
      daysToExpiry: 60,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 5,
      createRenewalOffer: true,
    },
    {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      monthlyRent: 1600,
      daysToExpiry: 180,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: true,
    },
    {
      firstName: 'Bob',
      lastName: 'Williams',
      email: 'bob.williams@example.com',
      monthlyRent: 1700,
      daysToExpiry: 30,
      leaseType: 'month_to_month',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: false,
    },
    {
      firstName: 'Carlos',
      lastName: 'Martinez',
      email: 'carlos.martinez@example.com',
      monthlyRent: 1400,
      daysToExpiry: 30,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 4,
      createRenewalOffer: false,
    },
    {
      firstName: 'Priya',
      lastName: 'Patel',
      email: 'priya.patel@example.com',
      monthlyRent: 1400,
      daysToExpiry: 60,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 4,
      createRenewalOffer: false,
    },
    {
      firstName: 'Emma',
      lastName: 'Brown',
      email: 'emma.brown@example.com',
      monthlyRent: 1400,
      daysToExpiry: 75,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 4,
      createRenewalOffer: false,
    },
    {
      firstName: 'Noah',
      lastName: 'Davis',
      email: 'noah.davis@example.com',
      monthlyRent: 1700,
      daysToExpiry: 30,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 4,
      createRenewalOffer: true,
    },
    {
      firstName: 'Liam',
      lastName: 'Wilson',
      email: 'liam.wilson@example.com',
      monthlyRent: 1700,
      daysToExpiry: 75,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: false,
    },
    {
      firstName: 'Mia',
      lastName: 'Taylor',
      email: 'mia.taylor@example.com',
      monthlyRent: 1700,
      daysToExpiry: 180,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: true,
    },
    {
      firstName: 'Olivia',
      lastName: 'Anderson',
      email: 'olivia.anderson@example.com',
      monthlyRent: 1700,
      daysToExpiry: 210,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: true,
    },
    {
      firstName: 'Ethan',
      lastName: 'Thomas',
      email: 'ethan.thomas@example.com',
      monthlyRent: 1700,
      daysToExpiry: 120,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: true,
    },
    {
      firstName: 'Ava',
      lastName: 'Jackson',
      email: 'ava.jackson@example.com',
      monthlyRent: 1500,
      daysToExpiry: 200,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 6,
      createRenewalOffer: true,
    },
    {
      firstName: 'Lucas',
      lastName: 'White',
      email: 'lucas.white@example.com',
      monthlyRent: 1700,
      daysToExpiry: 150,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 5,
      createRenewalOffer: true,
    },
    {
      firstName: 'Sophia',
      lastName: 'Harris',
      email: 'sophia.harris@example.com',
      monthlyRent: 1700,
      daysToExpiry: 210,
      leaseType: 'fixed',
      paymentsInLastSixMonths: 5,
      createRenewalOffer: true,
    },
  ];

  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = scenarios[index];
    await createResidentScenario({
      propertyId: property.id,
      unitId: units[index].id,
      ...scenario,
    });
  }

  console.log(`Seed complete. propertyId=${property.id}`);
}

async function clearSeedProperty(propertyId: string) {
  await prisma.webhookDeliveryAttempt.deleteMany({
    where: { webhookState: { propertyId } },
  });
  await prisma.webhookDeadLetterQueue.deleteMany({ where: { propertyId } });
  await prisma.webhookDeliveryState.deleteMany({ where: { propertyId } });
  await prisma.renewalEvent.deleteMany({ where: { propertyId } });
  await prisma.renewalRiskSignal.deleteMany({ where: { propertyId } });
  await prisma.renewalRiskScore.deleteMany({ where: { propertyId } });
  await prisma.renewalOffer.deleteMany({ where: { propertyId } });
  await prisma.residentLedger.deleteMany({ where: { propertyId } });
  await prisma.lease.deleteMany({ where: { propertyId } });
  await prisma.resident.deleteMany({ where: { propertyId } });
  await prisma.unitPricing.deleteMany({ where: { unit: { propertyId } } });
  await prisma.unit.deleteMany({ where: { propertyId } });
  await prisma.unitType.deleteMany({ where: { propertyId } });
  await prisma.property.delete({ where: { id: propertyId } });
}

async function createResidentScenario(params: {
  propertyId: string;
  unitId: string;
  firstName: string;
  lastName: string;
  email: string;
  monthlyRent: number;
  daysToExpiry: number;
  leaseType: 'fixed' | 'month_to_month';
  paymentsInLastSixMonths: number;
  createRenewalOffer: boolean;
}) {
  const resident = await prisma.resident.create({
    data: {
      propertyId: params.propertyId,
      unitId: params.unitId,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      status: 'active',
      moveInDate: new Date('2023-01-15'),
    },
  });

  const leaseEndDate = new Date();
  leaseEndDate.setDate(leaseEndDate.getDate() + params.daysToExpiry);

  const lease = await prisma.lease.create({
    data: {
      propertyId: params.propertyId,
      residentId: resident.id,
      unitId: params.unitId,
      leaseStartDate: new Date('2023-01-15'),
      leaseEndDate,
      monthlyRent: params.monthlyRent,
      leaseType: params.leaseType,
      status: 'active',
    },
  });

  for (let monthOffset = 0; monthOffset < params.paymentsInLastSixMonths; monthOffset += 1) {
    const transactionDate = new Date();
    transactionDate.setMonth(transactionDate.getMonth() - monthOffset);
    await prisma.residentLedger.create({
      data: {
        propertyId: params.propertyId,
        residentId: resident.id,
        transactionType: 'payment',
        chargeCode: 'rent',
        amount: params.monthlyRent,
        transactionDate,
      },
    });
  }

  if (params.createRenewalOffer) {
    const renewalStartDate = new Date();
    renewalStartDate.setDate(renewalStartDate.getDate() + params.daysToExpiry);
    const renewalEndDate = new Date(renewalStartDate);
    renewalEndDate.setDate(renewalEndDate.getDate() + 365);

    await prisma.renewalOffer.create({
      data: {
        propertyId: params.propertyId,
        residentId: resident.id,
        leaseId: lease.id,
        renewalStartDate,
        renewalEndDate,
        proposedRent: params.monthlyRent + 50,
        status: 'pending',
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
