// This interface defines the properties for a Blog object
export interface IBlogCategory {
  // A string containing the category name
  category_name: string;
  // A string containing the category description
  category_description: string;
  // A string containing the category alias
  cateogry_alias: string;
}

// This interface extends from Document and Blog interfaces.
export interface IBlogCategoryDocument extends Document, IBlogCategory {}
