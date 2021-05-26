const { response, request } = require("express");

// Renomeando uma classe
const { v4: uuidv4} = require("uuid")
const express = require("express")
const app     = express();

app.use(express.json())

const customers = []

// Middlewares
function verifyIfExistsAccountCPF(request, response, next) {

    const {cpf} = request.headers
    const customer = customers.find(customer => customer.cpf === cpf)

    if(!customer) {
        return response.status(400).json({error: "Customer not found"})
    }

    request.customer = customer

    return next()

}

function getBalance(statement) {
    const balance = statement.reduce((acumulador, operation) => {
        if (operation.type === 'credit') {
            return acumulador + operation.amount
        } else {
            return acumulador - operation.amount
        }
    }, 0)

    return balance
}

/*
* cpf - string
* name - string
* id - uuid (universally unique identifier)
* statement - []
*/
app.post("/account", (request, response) => {

    const {name, cpf} = request.body 

    const customerAlreadyExist = customers.some(
        (customer)=> customer.cpf === cpf
    )

    if (customerAlreadyExist) {
        return response.status(400).json({message: "Customer Alerady Exists"})
    }

    customers.push({
        cpf,
        name,
        uuid: uuidv4(),
        statement: []
    })

    return response.status(201).send({message: true})

})

// Todas as rotas abaixo terão esse middleware
app.use(verifyIfExistsAccountCPF)

// Verifica saldo
app.get("/statement", (request, response) => {
    const { customer } = request
    return response.json(customer.statement)
})

// Verifica saldo por data
app.get("/statement/date", (request, response) => {
    const {customer} = request
    const {date} = request.query

    const dateFormat = new Date(date + " 00:00")

    const statement = customer.statement.filter( 
        (statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString() 
    )

    if (statement) {
        return response.json(statement)
    }

})

// Realiza depósito
app.post("/deposit", (request, response) => {
    const { description, amount } = request.body

    const {customer} = request

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).json({deposit: true})

})
// Realiza saque

app.post("/withdraw", (request, response) => {
    const { amount } = request.body
    const {customer} = request

    const balance = getBalance(customer.statement) 

    if (balance < amount) {
        return response.status(400).json({"error" : "Insufficient funds!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation)

    return response.send()
})

// Atualiza nome do dono da conta
app.put("/account", (request, response) => {
    const {name} = request.body
    const {customer} = request

    customer.name = name

    return response.status(201).json({edit: true})
})

// Recupera dados da conta
app.get("/account", (request, response) => {
    const {customer} = request
    return response.json(customer)
})

// Remove uma conta
app.delete("/account", (request, response) => {
    const {customer} = request

    // splice
    customers.splice(customer, 1)

    return response.status(200).json(customers)
})

app.get("/balance", (request, response) => {
    
    const {customer} = request
    const balance = getBalance(customer.statement)
 
    return response.json(balance)
})

app.listen(7000)