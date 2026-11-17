import type {
  Customer,
  GalleryItem,
  Holiday,
  LocalizedText,
  Review,
  Service,
  Settings,
  Staff,
  TimeOff,
  TimeOffStatus,
} from '@/types';
import { latency, ApiError } from './latency';
import { loadDb, mutateDb } from './store';

const uid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const getServices = async (): Promise<Service[]> => {
  await latency();
  return loadDb().services;
};

export const getServiceById = async (id: string): Promise<Service | null> => {
  await latency();
  return loadDb().services.find((service) => service.id === id) ?? null;
};

export const saveService = async (service: Service): Promise<Service> => {
  await latency();
  return mutateDb((db) => {
    const index = db.services.findIndex((item) => item.id === service.id);
    if (index === -1) {
      db.services.push(service);
    } else {
      db.services[index] = service;
    }
    return service;
  });
};

export const createService = async (
  input: Omit<Service, 'id' | 'slug'>,
): Promise<Service> => {
  const id = uid('svc');
  const slug = id.replace('svc_', 'service-');
  return saveService({ ...input, id, slug });
};

export const deleteService = async (id: string): Promise<void> => {
  await latency();
  mutateDb((db) => {
    db.services = db.services.filter((service) => service.id !== id);
    db.staff = db.staff.map((member) => ({
      ...member,
      services: member.services.filter((serviceId) => serviceId !== id),
    }));
  });
};

export const getStaff = async (): Promise<Staff[]> => {
  await latency();
  return loadDb().staff;
};

export const getStaffById = async (id: string): Promise<Staff | null> => {
  await latency();
  return loadDb().staff.find((member) => member.id === id) ?? null;
};

export const saveStaff = async (member: Staff): Promise<Staff> => {
  await latency();
  return mutateDb((db) => {
    const index = db.staff.findIndex((item) => item.id === member.id);
    if (index === -1) {
      db.staff.push(member);
    } else {
      db.staff[index] = member;
    }
    return member;
  });
};

export const createStaff = async (input: Omit<Staff, 'id'>): Promise<Staff> => {
  const member: Staff = { ...input, id: uid('stf') };
  return saveStaff(member);
};

export const getReviews = async (): Promise<Review[]> => {
  await latency();
  return loadDb().reviews;
};

export const getGallery = async (): Promise<GalleryItem[]> => {
  await latency();
  return loadDb().gallery;
};

export const getSettings = async (): Promise<Settings> => {
  await latency();
  return loadDb().settings;
};

export const updateSettings = async (patch: Partial<Settings>): Promise<Settings> => {
  await latency();
  return mutateDb((db) => {
    db.settings = { ...db.settings, ...patch };
    return db.settings;
  });
};

export const getCustomers = async (): Promise<Customer[]> => {
  await latency();
  return loadDb().customers;
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
  await latency();
  return loadDb().customers.find((customer) => customer.id === id) ?? null;
};

export const findCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  await latency();
  const normalized = phone.trim();
  return loadDb().customers.find((customer) => customer.phone === normalized) ?? null;
};

export const updateCustomer = async (
  id: string,
  patch: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'notes'>>,
): Promise<Customer> => {
  await latency();
  return mutateDb((db) => {
    const customer = db.customers.find((item) => item.id === id);
    if (!customer) throw new ApiError('customer_not_found');
    Object.assign(customer, patch);
    return customer;
  });
};

export const getHolidays = async (): Promise<Holiday[]> => {
  await latency();
  return loadDb().holidays;
};

export const addHoliday = async (date: string, title: LocalizedText): Promise<Holiday> => {
  await latency();
  return mutateDb((db) => {
    const holiday: Holiday = { id: uid('hol'), date, title };
    db.holidays = [...db.holidays.filter((item) => item.date !== date), holiday];
    return holiday;
  });
};

export const removeHoliday = async (id: string): Promise<void> => {
  await latency();
  mutateDb((db) => {
    db.holidays = db.holidays.filter((holiday) => holiday.id !== id);
  });
};

export const getTimeOff = async (staffId?: string): Promise<TimeOff[]> => {
  await latency();
  const entries = loadDb().timeOff;
  return staffId ? entries.filter((entry) => entry.staffId === staffId) : entries;
};

export const requestTimeOff = async (input: {
  staffId: string;
  fromDate: string;
  toDate: string;
  reason?: string;
}): Promise<TimeOff> => {
  await latency();
  return mutateDb((db) => {
    const entry: TimeOff = {
      ...input,
      id: uid('to'),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.timeOff.push(entry);
    return entry;
  });
};

export const updateTimeOffStatus = async (
  id: string,
  status: TimeOffStatus,
): Promise<TimeOff> => {
  await latency();
  return mutateDb((db) => {
    const entry = db.timeOff.find((item) => item.id === id);
    if (!entry) throw new ApiError('time_off_not_found');
    entry.status = status;
    return entry;
  });
};
