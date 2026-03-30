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
    // Keep seed idempotent for quick reruns during take-home verification.
    console.log(`Seed already exists. propertyId=${existing.id}`);
    return;
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

  await createResidentScenario({
    propertyId: property.id,
    unitId: units[0].id,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    monthlyRent: 1400,
    daysToExpiry: 45,
    leaseType: 'fixed',
    paymentsInLastSixMonths: 6,
    createRenewalOffer: false,
  });

  await createResidentScenario({
    propertyId: property.id,
    unitId: units[1].id,
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    monthlyRent: 1500,
    daysToExpiry: 60,
    leaseType: 'fixed',
    paymentsInLastSixMonths: 5,
    createRenewalOffer: false,
  });

  await createResidentScenario({
    propertyId: property.id,
    unitId: units[2].id,
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@example.com',
    monthlyRent: 1600,
    daysToExpiry: 180,
    leaseType: 'fixed',
    paymentsInLastSixMonths: 6,
    createRenewalOffer: true,
  });

  await createResidentScenario({
    propertyId: property.id,
    unitId: units[3].id,
    firstName: 'Bob',
    lastName: 'Williams',
    email: 'bob.williams@example.com',
    monthlyRent: 1450,
    daysToExpiry: 30,
    leaseType: 'month_to_month',
    paymentsInLastSixMonths: 6,
    createRenewalOffer: false,
  });

  console.log(`Seed complete. propertyId=${property.id}`);
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
