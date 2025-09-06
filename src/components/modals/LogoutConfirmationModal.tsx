import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const handleConfirm = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onConfirm();
  };

  const handleClose = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[99999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-red-500" />
            Log out
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to log out? You will need to sign in again to access your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            onTouchEnd={handleClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            onTouchEnd={handleConfirm}
            disabled={isLoading}
            className="flex-1 sm:flex-none bg-teal-500 hover:bg-teal-600 text-white"
          >
            {isLoading ? 'Signing out...' : 'Log out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutConfirmationModal;
