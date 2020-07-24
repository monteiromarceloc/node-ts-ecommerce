import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomerExists = await this.customersRepository.findById(
      customer_id,
    );
    if (!checkCustomerExists) {
      throw new AppError('Customer does not exists.');
    }

    const productsIds = products.map(p => ({
      id: p.id,
    }));
    const foundProducts = await this.productsRepository.findAllById(
      productsIds,
    );
    if (foundProducts.length < products.length) {
      throw new AppError('Algum produto não foi encontrado.');
    }
    // TODO: check quantitys

    // TODO: create order_products properly
    const order_products = foundProducts.map(p => ({
      product_id: p.id,
      price: p.price,
      quantity: p.quantity,
    }));

    const order = await this.ordersRepository.create({
      customer: checkCustomerExists,
      products: order_products,
    });

    await this.productsRepository.updateQuantity(
      products.map(p1 => {
        const oldProduct = foundProducts.find(p2 => p1.id === p2.id);
        if (!oldProduct) return p1;
        return {
          id: p1.id,
          quantity: oldProduct.quantity - p1.quantity,
        };
      }),
    );

    return order;
  }
}

export default CreateOrderService;
