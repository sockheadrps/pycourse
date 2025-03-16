# Defining Data

Referring back to our laptop abstraction, we can see there is static data associated with our model. When tied to an abstraction, this data is referred to as **properties** or **attributes**. By looking beyond the naming and focusing on the data itself, we notice one property has been set to a value—currently “Off.”

Since this is pseudo-code (not valid Python syntax), describing a property with states “off” or “on” is understandable. However, in Python, we typically represent such a property with a **boolean**, which can only be `True` or `False`.

Below are some standard, primitive data types in Python:


- **Boolean** – Can only be `True` or `False`.
- **Integer** – Any whole number (without a decimal). For example: `0`, `-5`, or `42`.
- **String** – Represents text. In Python, even single characters are considered strings, and they include anything wrapped in quotes, such as `"A"`, `"Hello"`, or `"#$@"`.
- **Float** – Any number that includes a decimal point (e.g., `70.0` or `8.88888`).
- **None** – Used to represent the absence of a value. Unlike `0` (integer), `False` (boolean), or `"Not Available"` (string), `None` indicates that a variable exists but currently holds no value.

We can illustrate these properties by imagining a laptop with attributes for power state, CPU cores, brand name, battery life, and more. Most of the data we interact with in Python will use these simple, foundational data types.

Beyond these, there are also **composite** data types like **lists**, which can store multiple values in a single variable (e.g., numbers, strings, or both). As you can see, representing data as a single, simple data point is straightforward, and these primitive data types form the foundation of Python programming.

```plaintext
Laptop:
  Properties:
    power_state = False
    cpu_cores = 4
    brand = "Dell"
    hours_of_battery_life = 2.5
    broken = True
```

Those are the simplest representation of data that python has, and will make up the majority of the data you will interact with.

Additionally, there are other data types, such as sequences, or lists. Lists and sequences represent some data that has multiple seperate values, but the values need to be tightly couples. To implement this, we literally list (insided square brackets) the data. [1,2,3,a]

As you can see, the representation of data as a single data point is actually fairly simple.
