package com.example.booking.controller;

import com.example.booking.dto.CustomerRequest;
import com.example.booking.model.Customer;
import com.example.booking.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping("/me")
    public Customer me(Authentication authentication) {
        return customerService.findById(principalId(authentication));
    }

    @PutMapping("/me")
    public Customer updateMe(Authentication authentication, @Valid @RequestBody CustomerRequest request) {
        return customerService.update(principalId(authentication), request);
    }

    private Long principalId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
