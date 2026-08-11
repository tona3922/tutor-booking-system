package com.example.booking.service;

import com.example.booking.dto.AssignTechnicianRequest;
import com.example.booking.dto.BookingRequest;
import com.example.booking.model.Booking;
import com.example.booking.model.Customer;
import com.example.booking.model.Dealership;
import com.example.booking.model.ServiceBay;
import com.example.booking.model.Technician;
import com.example.booking.model.Vehicle;
import com.example.booking.repository.BookingRepository;
import com.example.booking.repository.BookingTechnicianRepository;
import com.example.booking.repository.CustomerRepository;
import com.example.booking.repository.DealershipRepository;
import com.example.booking.repository.ServiceBayRepository;
import com.example.booking.repository.TechnicianRepository;
import com.example.booking.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises BookingService against a real Postgres container (H2 doesn't emulate row-locking
 * semantics) to prove the PESSIMISTIC_WRITE lock in create()/assignTechnician() actually
 * serializes concurrent requests for the same bay/technician instead of letting both through.
 */
@SpringBootTest
@Testcontainers
class BookingServiceConcurrencyTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private BookingService bookingService;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private BookingTechnicianRepository bookingTechnicianRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private VehicleRepository vehicleRepository;
    @Autowired
    private DealershipRepository dealershipRepository;
    @Autowired
    private ServiceBayRepository serviceBayRepository;
    @Autowired
    private TechnicianRepository technicianRepository;

    private Long customerId;
    private Long vehicleId;
    private Long dealershipId;

    @BeforeEach
    void setUp() {
        Customer customer = new Customer();
        customer.setName("Race Tester");
        customer.setEmail("race-" + System.nanoTime() + "@example.com");
        customer.setPhone("555-0100");
        customer.setPasswordHash("irrelevant");
        customerId = customerRepository.save(customer).getId();

        Vehicle vehicle = new Vehicle();
        vehicle.setCustomerId(customerId);
        vehicle.setPlateNumber("RACE-" + System.nanoTime());
        vehicle.setBrand("Test");
        vehicle.setModel("Car");
        vehicle.setYear(2024);
        vehicleId = vehicleRepository.save(vehicle).getId();

        Dealership dealership = new Dealership();
        dealership.setName("Race Dealership");
        dealership.setAddress("1 Race St");
        dealership.setOpenTime(LocalDateTime.now().withHour(8).withMinute(0));
        dealership.setCloseTime(LocalDateTime.now().withHour(18).withMinute(0));
        dealershipId = dealershipRepository.save(dealership).getId();
    }

    @Test
    void concurrentOverlappingBookingsOnSameBayOnlyOneSucceeds() throws Exception {
        Long bayId = serviceBayRepository.save(bay("R1")).getId();

        LocalDateTime baseStart = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0);
        BookingRequest requestA = bookingRequest(bayId, baseStart, baseStart.plusHours(1));
        BookingRequest requestB = bookingRequest(bayId, baseStart.plusMinutes(30), baseStart.plusMinutes(90));

        List<Boolean> outcomes = raceTwo(
                () -> bookingService.create(customerId, requestA),
                () -> bookingService.create(customerId, requestB)
        );

        assertThat(outcomes).containsExactlyInAnyOrder(true, false);
        assertThat(bookingRepository.findByServiceBayIdAndStatusNotAndStartTimeLessThanAndEndTimeGreaterThan(
                bayId, Booking.Status.CANCELLED, baseStart.plusHours(2), baseStart.minusHours(1)))
                .hasSize(1);
    }

    @Test
    void concurrentOverlappingAssignmentsOfSameTechnicianOnlyOneSucceeds() throws Exception {
        Long bay1Id = serviceBayRepository.save(bay("R1")).getId();
        Long bay2Id = serviceBayRepository.save(bay("R2")).getId();

        Technician technician = new Technician();
        technician.setDealershipId(dealershipId);
        technician.setName("Race Tech");
        technician.setSkill("General");
        Long technicianId = technicianRepository.save(technician).getId();

        LocalDateTime baseStart = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0);
        Booking booking1 = bookingService.create(customerId, bookingRequest(bay1Id, baseStart, baseStart.plusHours(1)));
        Booking booking2 = bookingService.create(customerId,
                bookingRequest(bay2Id, baseStart.plusMinutes(30), baseStart.plusMinutes(90)));

        AssignTechnicianRequest assignA = assignTechnicianRequest(technicianId);
        AssignTechnicianRequest assignB = assignTechnicianRequest(technicianId);

        List<Boolean> outcomes = raceTwo(
                () -> bookingService.assignTechnician(booking1.getId(), customerId, assignA),
                () -> bookingService.assignTechnician(booking2.getId(), customerId, assignB)
        );

        assertThat(outcomes).containsExactlyInAnyOrder(true, false);
        assertThat(bookingTechnicianRepository.findByTechnicianId(technicianId)).hasSize(1);
    }

    private BookingRequest bookingRequest(Long bayId, LocalDateTime start, LocalDateTime end) {
        BookingRequest request = new BookingRequest();
        request.setVehicleId(vehicleId);
        request.setDealershipId(dealershipId);
        request.setServiceBayId(bayId);
        request.setStartTime(start);
        request.setEndTime(end);
        return request;
    }

    private AssignTechnicianRequest assignTechnicianRequest(Long technicianId) {
        AssignTechnicianRequest request = new AssignTechnicianRequest();
        request.setTechnicianId(technicianId);
        request.setRole("Primary");
        return request;
    }

    private ServiceBay bay(String bayNumber) {
        ServiceBay bay = new ServiceBay();
        bay.setDealershipId(dealershipId);
        bay.setBayNumber(bayNumber);
        return bay;
    }

    /**
     * Runs both actions on separate threads gated behind a CyclicBarrier so they hit the
     * database at nearly the same instant, exercising lock contention rather than relying on
     * the two calls happening to serialize naturally due to thread scheduling.
     */
    private List<Boolean> raceTwo(Callable<?> first, Callable<?> second) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        try {
            List<Future<Boolean>> futures = List.of(
                    pool.submit(() -> attempt(first, barrier)),
                    pool.submit(() -> attempt(second, barrier))
            );
            List<Boolean> outcomes = new ArrayList<>();
            for (Future<Boolean> future : futures) {
                outcomes.add(future.get(30, TimeUnit.SECONDS));
            }
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }

    private boolean attempt(Callable<?> action, CyclicBarrier barrier) throws Exception {
        barrier.await();
        try {
            action.call();
            return true;
        } catch (IllegalStateException e) {
            return false;
        }
    }
}
