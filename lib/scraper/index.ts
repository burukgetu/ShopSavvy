/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import * as cheerio from 'cheerio';
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url: string) {

  if(!url) return;

  // BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: 'brd.superproxy.io',
    port,
    rejectUnauthorized: false,
  }

  try {
    // Fetch the product page
    const response = await axios.get(url, options);

    const $ = cheerio.load(response.data);

    // Extract the product title
    const title = $('#productTitle').text().trim();
    const originalPrice = extractPrice(
        // $('.priceToPay span.a-price-whole'),
        // $('.a.size.base.a-color-price'),
        // $('.a-button-selected .a-color-base'),
        // $('.a-price.a-text-price')
        $('table.a-lineitem tr:contains("List Price") .a-price .a-offscreen')
    );
    
    const currentPrice = extractPrice(
    //     $('#priceblock_ourprice'),
    //     $('.a-price.a-text-price span.a-offscreen'),
    //     $('#listPrice'),
    //     $('#priceblock_dealprice'),
    //     $('.a-size-base.a-color-price'),
    //     $('.a-price .a-offscreen')
    $('.a-price span.a-offscreen')
    );

    const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable';
 
    const images = 
    $('#imgBlkFront').attr('data-a-dynamic-image') || 
    $('#landingImage').attr('data-a-dynamic-image') ||
    '{}'
    
    const imageUrls = Object.keys(JSON.parse(images));
    
    const currency = extractCurrency($('.a-price-symbol'))
    
    const percentageText = $('table.a-lineitem tr:contains("You Save") .a-color-price').contents().filter(function() {
        return this.nodeType === 3; // Only grab the text node (ignores dollar amount)
      }).text().trim();

    const match = percentageText.match(/\d+/);
    let discountRate = '';
    if (match) {
       discountRate = match[0];
    }

    const description = extractDescription($)

    // Construct data object with scraped information
    const data = {
      url,
      currency: currency || '$',
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: 'category',
      reviewsCount:100,
      stars: 4.5,
      isOutOfStock: outOfStock,
      description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: Number(currentPrice) || Number(originalPrice),
    }

    return data;
  } catch (error: any) {
    console.log(error);
  }
}