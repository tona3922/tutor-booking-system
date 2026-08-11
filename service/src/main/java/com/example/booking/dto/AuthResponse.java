package com.example.booking.dto;

import com.example.booking.model.Customer;

public record AuthResponse(String token, Customer customer) {
}
