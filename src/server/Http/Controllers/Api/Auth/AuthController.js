import AuthService from '../../../../Services/Auth/AuthService';
import { serializeBigInt } from 'src/utils/bigint-serializer';

/**
 * Authentication Controller
 * Handles all authentication-related HTTP requests
 */
class AuthController {
  /**
   * Login user
   * @param {NextApiRequest} req 
   * @param {NextApiResponse} res 
   */
  async login(req, res) {
    try {
      const { identifier, password } = req.body;

      // Validation
      if (!identifier || !password) {
        return res.status(400).json({
          status: false,
          message: 'Identifier and password are required'
        });
      }

      // Authenticate user
      const result = await AuthService.login(identifier, password);

      return res.status(200).json({
        status: true,
        message: 'Login successful',
        data: serializeBigInt(result)
      });
    } catch (error) {
      console.error('Login error:', error);
      
      return res.status(401).json({
        status: false,
        message: error.message || 'Login failed'
      });
    }
  }

  /**
   * Logout user
   * @param {NextApiRequest} req 
   * @param {NextApiResponse} res 
   */
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token from localStorage
      // Optionally, you can implement token blacklisting here
      
      return res.status(200).json({
        status: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);

      return res.status(500).json({
        status: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Verify token and get user data
   * @param {NextApiRequest} req 
   * @param {NextApiResponse} res 
   */
  async verify(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          status: false,
          message: 'No token provided'
        });
      }

      const userData = await AuthService.verifyToken(token);

      return res.status(200).json({
        status: true,
        data: serializeBigInt(userData)
      });
    } catch (error) {
      console.error('Token verification error:', error);

      return res.status(401).json({
        status: false,
        message: 'Invalid or expired token'
      });
    }
  }

  /**
   * Get current user (me endpoint)
   * @param {NextApiRequest} req 
   * @param {NextApiResponse} res 
   */
  async me(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          status: false,
          message: 'No token provided'
        });
      }

      const userData = await AuthService.verifyToken(token);

      return res.status(200).json({
        status: true,
        data: serializeBigInt(userData)
      });
    } catch (error) {
      console.error('Get current user error:', error);

      return res.status(401).json({
        status: false,
        message: error.message || 'Authentication required'
      });
    }
  }

  /**
   * Refresh access token
   * @param {NextApiRequest} req 
   * @param {NextApiResponse} res 
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          status: false,
          message: 'Refresh token is required'
        });
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      return res.status(200).json({
        status: true,
        message: 'Token refreshed successfully',
        data: serializeBigInt(result)
      });
    } catch (error) {
      console.error('Refresh token error:', error);

      return res.status(401).json({
        status: false,
        message: error.message || 'Invalid or expired refresh token'
      });
    }
  }
}

export default new AuthController();

