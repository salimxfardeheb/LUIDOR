-- CreateTable
CREATE TABLE "booking_services" (
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("bookingId","serviceId")
);

-- CreateIndex
CREATE INDEX "booking_services_serviceId_idx" ON "booking_services"("serviceId");

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
