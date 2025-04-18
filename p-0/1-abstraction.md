# Understanding Code and Its Structure  

To understand how code is written, it might be best to first explain how it is typically structured. Before diving into that, let's consider a fundamental question:  

## Why Do We Write Code?  

Simply put, we write code to accomplish tasks. Code, like any other tool, is designed to solve problems. When used correctly, it can be leveraged to perform a wide range of functions. While code is often associated with logic and mathematics, it extends far beyond just solving numerical problems—it's used in everything from web development to artificial intelligence.  

The way we use code to solve problems is through **abstractions**.  

## What is an Abstraction?  

An **abstraction** is a conceptual model that represents something—whether it's a real-world object, a process, or an idea. In programming, abstractions help us define structures that represent these things in a logical, organized way.  

Typically, an abstraction consists of:  

- **An Object**: A defined entity that represents something.  
- **Properties**: Quantifiable characteristics or attributes the object "owns" and keeps track of.  
- **Actions (Methods)**: Behaviors or functions that allow the object to perform specific tasks or modify its properties.  

These methods sometimes accept **parameters**—variable data passed into the method to modify how it operates or affects the object's properties.  

## A Simple Example  

To illustrate this concept, let’s define a simple abstraction for a **laptop** using pseudo-code.  

A laptop has a **power state**, which can be either "On" or "Off." It also has an **action** that affects this state: turning the power on or off.  

### Pseudo-code Representation:  

```plaintext
Laptop:
  Properties:
    power_state = Off

  Methods:
    toggle_power():
      power_state = inverse of current power_state
 ```
 This abstraction shows that the **Laptop** object has an internal state (**power_state**) that it keeps track of, even when changes occur. The transformation of this state happens through the **toggle_power** method, which modifies the property based on a defined set of instructions.  

This is a basic example, but it provides a starting point for understanding how we use abstractions to represent things and ideas in code. As we build upon these concepts, we can model increasingly complex systems and interactions, allowing us to write more powerful and efficient programs.